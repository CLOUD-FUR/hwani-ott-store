import { NextResponse } from 'next/server';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusEmail } from '@/lib/email';
import { getAdminUsername } from '@/lib/admin-auth';

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
};

const MAX_RETRIES = 3;

// Fire-and-forget helper: runs a promise in the background without blocking the response.
function fireAndForget(promise: Promise<unknown>, label: string): void {
  promise.catch((error) => {
    console.error(`Background task error [${label}]:`, error);
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUsername();
  if (!admin) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json() as { status?: unknown; deliveryInfo?: unknown; rejectionReason?: unknown };
    const status =
      typeof body.status === 'string' && Object.values(OrderStatus).includes(body.status as OrderStatus)
        ? (body.status as OrderStatus)
        : null;
    const deliveryInfo = typeof body.deliveryInfo === 'string' ? body.deliveryInfo.trim() : '';
    const rejectionReason = typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() : '';
    if (!status) return NextResponse.json({ success: false, error: '유효하지 않은 주문 상태입니다.' }, { status: 400 });

    let result;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await prisma.$transaction(
          async (tx) => {
            const order = await tx.order.findUnique({
              where: { id },
              include: { user: true, orderItems: { include: { option: true } } },
            });
            if (!order) throw new Error('NOT_FOUND');
            if (!transitions[order.status].includes(status)) throw new Error('INVALID_TRANSITION');
            if (status === 'REJECTED' && !rejectionReason) throw new Error('REASON_REQUIRED');
            if (status === 'COMPLETED' && !deliveryInfo && !order.deliveryInfo) throw new Error('DELIVERY_REQUIRED');

            if (status === 'APPROVED') {
              for (const item of order.orderItems) {
                if (!item.optionId) continue;
                const updated = await tx.productOption.updateMany({
                  where: { id: item.optionId, stock: { gte: item.quantity } },
                  data: { stock: { decrement: item.quantity } },
                });
                if (updated.count !== 1) throw new Error('OUT_OF_STOCK');
              }
            }
            if (status === 'CANCELLED' && order.status === 'APPROVED') {
              for (const item of order.orderItems) {
                if (item.optionId) {
                  await tx.productOption.update({
                    where: { id: item.optionId },
                    data: { stock: { increment: item.quantity } },
                  });
                }
              }
            }

            const updated = await tx.order.update({
              where: { id },
              data: {
                status,
                deliveryInfo: deliveryInfo || undefined,
                rejectionReason:
                  status === 'REJECTED' ? rejectionReason : status === 'PENDING' ? null : undefined,
                approvedAt: status === 'APPROVED' ? new Date() : undefined,
                completedAt: status === 'COMPLETED' ? new Date() : undefined,
              },
              include: { user: true, orderItems: { include: { product: true, option: true } } },
            });

            if (status === 'COMPLETED') {
              // Batch product sales increment — each product gets a different increment
              // so we must loop, but we avoid re-fetching per item.
              const productSalesMap = new Map<string, number>();
              for (const item of order.orderItems) {
                productSalesMap.set(item.productId, (productSalesMap.get(item.productId) || 0) + item.quantity);
              }
              await Promise.all(
                Array.from(productSalesMap.entries()).map(([productId, qty]) =>
                  tx.product.update({ where: { id: productId }, data: { sales: { increment: qty } } }),
                ),
              );

              const total = await tx.order.aggregate({
                where: { userId: order.userId, status: 'COMPLETED' },
                _sum: { totalAmount: true },
              });

              const tiers = await tx.tierConfig.findMany({ orderBy: { minPurchase: 'desc' } });
              const newTier = tiers.find((config) => (total._sum.totalAmount || 0) >= config.minPurchase)?.tier || Role.USER;

              await tx.user.update({ where: { id: order.userId }, data: { tier: newTier } });
            }

            await tx.log.create({
              data: {
                type: 'ADMIN',
                userId: order.userId,
                email: order.user.email,
                action: '주문 상태 변경',
                details: {
                  admin,
                  orderId: id,
                  orderNumber: order.orderNumber,
                  oldStatus: order.status,
                  newStatus: status,
                  rejectionReason: rejectionReason || undefined,
                  deliveryInfo: Boolean(deliveryInfo),
                },
              },
            });

            return { order, updated };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
        );
        break; // Success — exit retry loop
      } catch (error) {
        // Retry on serialization conflicts (P2034) and deadlocks (P2024)
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2034' || error.code === 'P2024') &&
          attempt < MAX_RETRIES
        ) {
          console.warn(
            `Transaction conflict on order state change (code: ${error.code}, attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying...`,
            { orderId: id, admin, targetStatus: status },
          );
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
          continue;
        }
        throw error;
      }
    }

    if (!result) throw new Error('TRANSACTION_FAILED');

    // Fire-and-forget: email notification does not block the admin response
    fireAndForget(
      sendOrderStatusEmail(result.order.user.email, result.order.orderNumber, status, deliveryInfo || undefined),
      'order-status-email',
    );

    return NextResponse.json({ success: true, data: result.updated });
  } catch (error) {
    // Handle Prisma-specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma known error during order state change:', {
        code: error.code,
        meta: error.meta,
        message: error.message,
        orderId: id,
        admin,
      });
      if (error.code === 'P2034' || error.code === 'P2024') {
        return NextResponse.json(
          { success: false, error: '동시 처리 충돌이 발생했습니다. 잠시 후 다시 시도해주세요.' },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { success: false, error: `주문 상태 변경 중 데이터베이스 오류가 발생했습니다 (코드: ${error.code}).` },
        { status: 500 },
      );
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error('Unknown Prisma error during order state change:', {
        error: error.message,
        orderId: id,
        admin,
      });
      return NextResponse.json(
        { success: false, error: '주문 상태 변경 중 알 수 없는 오류가 발생했습니다.' },
        { status: 500 },
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error('Database initialization error during order state change:', {
        message: error.message,
        orderId: id,
        admin,
      });
      return NextResponse.json(
        { success: false, error: '데이터베이스 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 },
      );
    }

    // Custom error codes
    const code = error instanceof Error ? error.message : '';
    const messages: Record<string, [string, number]> = {
      NOT_FOUND: ['주문을 찾을 수 없습니다.', 404],
      INVALID_TRANSITION: ['허용되지 않는 상태 변경입니다.', 409],
      REASON_REQUIRED: ['거절 사유를 입력해주세요.', 400],
      DELIVERY_REQUIRED: ['거래 완료 전 전달 정보를 입력해주세요.', 400],
      OUT_OF_STOCK: ['재고가 부족합니다.', 409],
      TRANSACTION_FAILED: ['트랜잭션 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 500],
    };
    if (messages[code]) {
      const [message, status] = messages[code];
      return NextResponse.json({ success: false, error: message }, { status });
    }

    console.error('Order state change error (unknown):', {
      error: error instanceof Error ? error.message : String(error),
      orderId: id,
      admin,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ success: false, error: '주문 상태 변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: '주문은 감사 기록 보존을 위해 삭제할 수 없습니다.' }, { status: 405 });
}
