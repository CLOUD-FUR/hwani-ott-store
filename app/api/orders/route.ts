import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyUserSession, generateOrderNumber } from '@/lib/auth';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { createLog } from '@/lib/logger';
import { LogType, Prisma } from '@prisma/client';

type OrderRequestItem = {
  productId: string;
  optionId?: string | null;
  quantity: number;
};

const MAX_RETRIES = 3;

// Fire-and-forget helper: runs a promise in the background without blocking the response.
// Errors are caught and logged to prevent unhandled promise rejections.
function fireAndForget(promise: Promise<unknown>, label: string): void {
  promise.catch((error) => {
    console.error(`Background task error [${label}]:`, error);
  });
}

export async function POST(request: Request) {
  let loggedUserId: string | null = null;
  try {
    const sessionToken = (await cookies()).get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const userId = await verifyUserSession(sessionToken);
    if (!userId) {
      return NextResponse.json({ success: false, error: '세션이 만료되었습니다.' }, { status: 401 });
    }
    loggedUserId = userId;

    // Narrow userId to string for use inside transaction closures — TypeScript
    // does not narrow mutable `let` variables inside nested callbacks.
    const currentUserId = userId;

    const body = await request.json() as { items?: unknown; depositorName?: unknown };
    const items = body.items;
    const depositorName = typeof body.depositorName === 'string' ? body.depositorName.trim() : '';
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ success: false, error: '주문 상품을 확인해주세요.' }, { status: 400 });
    }
    if (!depositorName || depositorName.length > 100) {
      return NextResponse.json({ success: false, error: '입금자명을 입력해주세요.' }, { status: 400 });
    }

    const normalizedItems: OrderRequestItem[] = [];
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        return NextResponse.json({ success: false, error: '주문 상품 형식이 올바르지 않습니다.' }, { status: 400 });
      }
      const candidate = item as Record<string, unknown>;
      const productId = typeof candidate.productId === 'string' ? candidate.productId : '';
      const optionId = candidate.optionId === null || candidate.optionId === undefined ? null : typeof candidate.optionId === 'string' ? candidate.optionId : '';
      const quantity = Number(candidate.quantity);
      if (!productId || optionId === '' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
        return NextResponse.json({ success: false, error: '주문 수량 또는 옵션을 확인해주세요.' }, { status: 400 });
      }
      normalizedItems.push({ productId, optionId: optionId ?? null, quantity });
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Pre-fetch settings outside the transaction to reduce lock time.
    // Settings rarely change, so this is safe and avoids holding a write lock unnecessary wide.
    const settings = await prisma.settings.findUnique({ where: { id: 'settings' } });
    const accountInfo = {
      bankName: settings?.bankName || '미설정',
      bankAccount: settings?.bankAccount || '미설정',
      accountHolder: settings?.accountHolder || '미설정',
    };

    let result;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({
            where: { id: currentUserId },
            select: { id: true, email: true, isBlacklisted: true, tier: true, uniqueId: true },
          });
          if (!user) throw new Error('USER_NOT_FOUND');
          if (user.isBlacklisted) throw new Error('BLACKLISTED');

          const recentOrdersCount = await tx.order.count({ where: { userId: currentUserId, createdAt: { gte: oneDayAgo } } });
          if (recentOrdersCount >= 10) throw new Error('ORDER_LIMIT');

          const tierConfig = await tx.tierConfig.findUnique({ where: { tier: user.tier } });
          const discountRate = tierConfig?.discountRate || 0;
          let totalAmount = 0;
          const orderItemsData: Array<{ productId: string; optionId: string | null; quantity: number; price: number; discount: number }> = [];

          // Batch-fetch all required products in a single query instead of looping findUnique.
          const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
          const products = await tx.product.findMany({
            where: { id: { in: productIds }, isVisible: true, isDraft: false },
            include: { options: true },
          });
          const productMap = new Map(products.map((p) => [p.id, p]));

          for (const item of normalizedItems) {
            const product = productMap.get(item.productId);
            if (!product) throw new Error('PRODUCT_NOT_AVAILABLE');
            const option = item.optionId ? product.options.find((candidate) => candidate.id === item.optionId) : null;
            if (item.optionId && !option) throw new Error('OPTION_NOT_FOUND');
            if (option && option.stock < item.quantity) throw new Error('OUT_OF_STOCK');
            const basePrice = product.salePrice + (option?.price || 0);
            const discount = Math.floor((basePrice * discountRate) / 100);
            const finalPrice = basePrice - discount;
            totalAmount += finalPrice * item.quantity;
            orderItemsData.push({
              productId: item.productId,
              optionId: item.optionId ?? null,
              quantity: item.quantity,
              price: finalPrice,
              discount,
            });
          }

          const sequenceUser = await tx.user.update({
            where: { id: currentUserId },
            data: { purchaseSequence: { increment: 1 } },
            select: { uniqueId: true, purchaseSequence: true },
          });
          const orderNumber = generateOrderNumber(sequenceUser.uniqueId, sequenceUser.purchaseSequence - 1);

          const order = await tx.order.create({
            data: {
              orderNumber,
              userId: currentUserId,
              userEmail: user.email,
              depositorName,
              totalAmount,
              accountInfo,
              orderItems: { create: orderItemsData },
            },
            include: { orderItems: { include: { product: true, option: true } } },
          });

          // Delete cart items for the ordered products. Use a single deleteMany per item
          // (sequential to respect transaction safety — Prisma tx clients are not parallel-safe).
          for (const item of normalizedItems) {
            await tx.cartItem.deleteMany({
              where: { userId: currentUserId, productId: item.productId, optionId: item.optionId },
            });
          }

          // Build email-ready items with product/option names (fixes the type mismatch
          // where productId/optionId were previously passed instead of productName/optionName).
          const emailItems = orderItemsData.map((item) => {
            const product = productMap.get(item.productId);
            const option = item.optionId ? product?.options.find((c) => c.id === item.optionId) : null;
            return {
              productName: product?.name,
              optionName: option?.name,
              quantity: item.quantity,
              price: item.price,
            };
          });

          return {
            order,
            userEmail: user.email,
            userId: user.id,
            userTier: user.tier,
            orderNumber,
            totalAmount,
            emailItems,
            accountInfo,
            discountRate,
            itemCount: normalizedItems.length,
          };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
        break; // Success — exit retry loop
      } catch (error) {
        // Retry on serialization conflicts (P2034) and deadlocks (P2024).
        // ReadCommitted is less prone to conflicts than Serializable, but concurrent
        // writes can still cause deadlocks that need retrying.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2034' || error.code === 'P2024') &&
          attempt < MAX_RETRIES
        ) {
          console.warn(
            `Transaction conflict on order creation (code: ${error.code}, attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying...`,
            { userId, orderId: result?.order?.id },
          );
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
          continue;
        }
        throw error;
      }
    }

    if (!result) throw new Error('TRANSACTION_FAILED');

    // Fire-and-forget: email + log do NOT block the client response.
    // Order is already committed; email/log failures are recorded separately.
    fireAndForget(
      sendOrderConfirmationEmail(result.userEmail, result.orderNumber, {
        totalAmount: result.totalAmount,
        items: result.emailItems,
        accountInfo: result.accountInfo,
      }),
      'order-confirmation-email',
    );
    fireAndForget(
      createLog({
        type: LogType.ORDER,
        userId: result.userId,
        email: result.userEmail,
        action: '주문 생성',
        details: {
          orderNumber: result.orderNumber,
          totalAmount: result.totalAmount,
          itemCount: result.itemCount,
          tier: result.userTier,
          discountRate: result.discountRate,
        },
      }),
      'order-creation-log',
    );

    return NextResponse.json({ success: true, message: '주문이 접수되었습니다.', data: result.order });
  } catch (error) {
    // Handle Prisma-specific errors with context
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma known error during order creation:', {
        code: error.code,
        meta: error.meta,
        message: error.message,
        userId: loggedUserId,
      });
      if (error.code === 'P2034') {
        return NextResponse.json(
          { success: false, error: '동시 주문 충돌이 발생했습니다. 잠시 후 다시 시도해주세요.' },
          { status: 409 },
        );
      }
      if (error.code === 'P2024') {
        return NextResponse.json(
          { success: false, error: '데이터베이스 락 충돌이 발생했습니다. 잠시 후 다시 시도해주세요.' },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { success: false, error: `주문 처리 중 데이터베이스 오류가 발생했습니다 (코드: ${error.code}).` },
        { status: 500 },
      );
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error('Unknown Prisma error during order creation:', {
        error: error.message,
        userId: loggedUserId,
      });
      return NextResponse.json(
        { success: false, error: '주문 처리 중 알 수 없는 데이터베이스 오류가 발생했습니다.' },
        { status: 500 },
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error('Database initialization error during order creation:', {
        message: error.message,
        userId: loggedUserId,
      });
      return NextResponse.json(
        { success: false, error: '데이터베이스 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 },
      );
    }

    // Custom error codes (thrown as Error messages inside the transaction)
    const errorCode = error instanceof Error ? error.message : '';
    const messages: Record<string, [string, number]> = {
      USER_NOT_FOUND: ['사용자를 찾을 수 없습니다.', 404],
      BLACKLISTED: ['차단된 계정입니다.', 403],
      ORDER_LIMIT: ['24시간 내 최대 10개의 주문만 가능합니다.', 429],
      PRODUCT_NOT_AVAILABLE: ['판매 중인 상품만 주문할 수 있습니다.', 400],
      OPTION_NOT_FOUND: ['상품 옵션을 찾을 수 없습니다.', 400],
      OUT_OF_STOCK: ['상품 재고가 부족합니다.', 409],
      TRANSACTION_FAILED: ['트랜잭션 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 500],
    };
    if (messages[errorCode]) {
      const [message, status] = messages[errorCode];
      return NextResponse.json({ success: false, error: message }, { status });
    }

    // Unknown errors — log full details server-side, return generic message
    console.error('Order creation error (unknown):', {
      error: error instanceof Error ? error.message : String(error),
      userId: loggedUserId,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ success: false, error: '주문 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 },
      );
    }

    const userId = await verifyUserSession(sessionToken);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '세션이 만료되었습니다.' },
        { status: 401 },
      );
    }

    const orders = await prisma.order.findMany({
      where: { userId: userId },
      include: {
        orderItems: {
          include: {
            product: true,
            option: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { success: false, error: '주문 내역을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
