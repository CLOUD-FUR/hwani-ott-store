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

export async function POST(request: Request) {
  try {
    const sessionToken = (await cookies()).get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const userId = await verifyUserSession(sessionToken);
    if (!userId) {
      return NextResponse.json({ success: false, error: '세션이 만료되었습니다.' }, { status: 401 });
    }

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

    let result;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({ where: { id: userId } });
          if (!user) throw new Error('USER_NOT_FOUND');
          if (user.isBlacklisted) throw new Error('BLACKLISTED');

          const recentOrdersCount = await tx.order.count({ where: { userId, createdAt: { gte: oneDayAgo } } });
          if (recentOrdersCount >= 10) throw new Error('ORDER_LIMIT');

          const tierConfig = await tx.tierConfig.findUnique({ where: { tier: user.tier } });
          const discountRate = tierConfig?.discountRate || 0;
          let totalAmount = 0;
          const orderItemsData: Array<{ productId: string; optionId: string | null; quantity: number; price: number; discount: number }> = [];

          for (const item of normalizedItems) {
            const product = await tx.product.findUnique({ where: { id: item.productId }, include: { options: true } });
            if (!product || !product.isVisible || product.isDraft) throw new Error('PRODUCT_NOT_AVAILABLE');
            const option = item.optionId ? product.options.find((candidate) => candidate.id === item.optionId) : null;
            if (item.optionId && !option) throw new Error('OPTION_NOT_FOUND');
            if (option && option.stock < item.quantity) throw new Error('OUT_OF_STOCK');
            const basePrice = product.salePrice + (option?.price || 0);
            const discount = Math.floor(basePrice * discountRate / 100);
            const finalPrice = basePrice - discount;
            totalAmount += finalPrice * item.quantity;
            orderItemsData.push({ productId: item.productId, optionId: item.optionId ?? null, quantity: item.quantity, price: finalPrice, discount });
          }

          const sequenceUser = await tx.user.update({
            where: { id: userId },
            data: { purchaseSequence: { increment: 1 } },
            select: { uniqueId: true, purchaseSequence: true },
          });
          const orderNumber = generateOrderNumber(sequenceUser.uniqueId, sequenceUser.purchaseSequence - 1);
          const settings = await tx.settings.findUnique({ where: { id: 'settings' } });
          const accountInfo = {
            bankName: settings?.bankName || '미설정',
            bankAccount: settings?.bankAccount || '미설정',
            accountHolder: settings?.accountHolder || '미설정',
          };
          const order = await tx.order.create({
            data: {
              orderNumber, userId, userEmail: user.email, depositorName, totalAmount, accountInfo,
              orderItems: { create: orderItemsData },
            },
            include: { orderItems: { include: { product: true, option: true } } },
          });

          // Delete only the exact cart lines submitted for this order.
          for (const item of normalizedItems) {
            await tx.cartItem.deleteMany({ where: { userId, productId: item.productId, optionId: item.optionId } });
          }
          return { order, user, orderNumber, totalAmount, orderItemsData, accountInfo, discountRate };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        break; // Success — exit retry loop
      } catch (error) {
        // Retry only on serialization write conflicts (P2034)
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034' &&
          attempt < MAX_RETRIES
        ) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
          continue;
        }
        throw error;
      }
    }

    if (!result) throw new Error('TRANSACTION_FAILED');

    try {
      await sendOrderConfirmationEmail(result.user.email, result.orderNumber, {
        totalAmount: result.totalAmount,
        items: result.orderItemsData,
        accountInfo: result.accountInfo,
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }
    await createLog({
      type: LogType.ORDER,
      userId: result.user.id,
      email: result.user.email,
      action: '주문 생성',
      details: { orderNumber: result.orderNumber, totalAmount: result.totalAmount, itemCount: normalizedItems.length, tier: result.user.tier, discountRate: result.discountRate },
    });
    return NextResponse.json({ success: true, message: '주문이 접수되었습니다.', data: result.order });
  } catch (error) {
    // Handle Prisma errors (e.g., serialization failures, constraint violations)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error during order creation:', error);
      if (error.code === 'P2034') {
        return NextResponse.json({ success: false, error: '동시 주문 충돌이 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 409 });
      }
      return NextResponse.json({ success: false, error: '주문 처리 중 데이터베이스 오류가 발생했습니다.' }, { status: 500 });
    }

    // Existing custom error code mapping (thrown as Error messages)
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
    console.error('Order creation error:', error);
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
        { status: 401 }
      );
    }

    const userId = await verifyUserSession(sessionToken);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '세션이 만료되었습니다.' },
        { status: 401 }
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
      { status: 500 }
    );
  }
}
