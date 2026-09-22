import { NextResponse } from 'next/server';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusEmail } from '@/lib/email';
import { createLog } from '@/lib/logger';
import { getAdminUsername } from '@/lib/admin-auth';

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['COMPLETED', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
};

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUsername();
  if (!admin) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await request.json() as { status?: unknown; deliveryInfo?: unknown; rejectionReason?: unknown };
    const status = typeof body.status === 'string' && Object.values(OrderStatus).includes(body.status as OrderStatus) ? body.status as OrderStatus : null;
    const deliveryInfo = typeof body.deliveryInfo === 'string' ? body.deliveryInfo.trim() : '';
    const rejectionReason = typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() : '';
    if (!status) return NextResponse.json({ success: false, error: '유효하지 않은 주문 상태입니다.' }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { user: true, orderItems: { include: { option: true } } } });
      if (!order) throw new Error('NOT_FOUND');
      if (!transitions[order.status].includes(status)) throw new Error('INVALID_TRANSITION');
      if (status === 'REJECTED' && !rejectionReason) throw new Error('REASON_REQUIRED');
      if (status === 'COMPLETED' && !deliveryInfo && !order.deliveryInfo) throw new Error('DELIVERY_REQUIRED');

      if (status === 'APPROVED') {
        for (const item of order.orderItems) {
          if (!item.optionId) continue;
          const updated = await tx.productOption.updateMany({ where: { id: item.optionId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
          if (updated.count !== 1) throw new Error('OUT_OF_STOCK');
        }
      }
      if (status === 'CANCELLED' && order.status === 'APPROVED') {
        for (const item of order.orderItems) if (item.optionId) await tx.productOption.update({ where: { id: item.optionId }, data: { stock: { increment: item.quantity } } });
      }

      const updated = await tx.order.update({ where: { id }, data: {
        status,
        deliveryInfo: deliveryInfo || undefined,
        rejectionReason: status === 'REJECTED' ? rejectionReason : status === 'PENDING' ? null : undefined,
        approvedAt: status === 'APPROVED' ? new Date() : undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
      }, include: { user: true, orderItems: { include: { product: true, option: true } } } });

      if (status === 'COMPLETED') {
        for (const item of order.orderItems) await tx.product.update({ where: { id: item.productId }, data: { sales: { increment: item.quantity } } });
        const completed = await tx.order.findMany({ where: { userId: order.userId, status: 'COMPLETED' }, include: { orderItems: true } });
        const total = completed.reduce((sum, completedOrder) => sum + completedOrder.orderItems.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0), 0);
        const tiers = await tx.tierConfig.findMany({ orderBy: { minPurchase: 'desc' } });
        const tier = tiers.find((config) => total >= config.minPurchase)?.tier || Role.USER;
        await tx.user.update({ where: { id: order.userId }, data: { tier } });
      }
      await tx.log.create({ data: { type: 'ADMIN', userId: order.userId, email: order.user.email, action: '주문 상태 변경', details: { admin, orderId: id, orderNumber: order.orderNumber, oldStatus: order.status, newStatus: status, rejectionReason: rejectionReason || undefined, deliveryInfo: Boolean(deliveryInfo) } } });
      return { order, updated };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    try { await sendOrderStatusEmail(result.order.user.email, result.order.orderNumber, status, deliveryInfo || undefined); } catch (emailError) { console.error('Status email failed:', emailError); }
    return NextResponse.json({ success: true, data: result.updated });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const messages: Record<string, [string, number]> = { NOT_FOUND: ['주문을 찾을 수 없습니다.', 404], INVALID_TRANSITION: ['허용되지 않는 상태 변경입니다.', 409], REASON_REQUIRED: ['거절 사유를 입력해주세요.', 400], DELIVERY_REQUIRED: ['거래 완료 전 전달 정보를 입력해주세요.', 400], OUT_OF_STOCK: ['재고가 부족합니다.', 409] };
    if (messages[code]) { const [message, status] = messages[code]; return NextResponse.json({ success: false, error: message }, { status }); }
    console.error('Order update error:', error);
    return NextResponse.json({ success: false, error: '주문 상태 변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: '주문은 감사 기록 보존을 위해 삭제할 수 없습니다.' }, { status: 405 });
}
