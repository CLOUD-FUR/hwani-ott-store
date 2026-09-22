import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusEmail } from '@/lib/email';
import { createLog } from '@/lib/logger';
import { getAdminUsername } from '@/lib/admin-auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const { id } = await params;
    const { status, deliveryInfo } = await request.json();

    const order = await prisma.order.findUnique({
      where: { id: id },
      include: { user: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: id },
      data: {
        status,
        deliveryInfo: deliveryInfo || order.deliveryInfo,
      },
      include: {
        user: true,
        orderItems: {
          include: {
            product: true,
            option: true,
          },
        },
      },
    });

    // 상태 변경 이메일 발송
    try {
      await sendOrderStatusEmail(
        order.user.email,
        order.orderNumber,
        status,
        deliveryInfo
      );
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // 로그 기록
    await createLog({
      type: 'ADMIN',
      action: '주문 상태 변경',
      details: {
        orderNumber: order.orderNumber,
        oldStatus: order.status,
        newStatus: status,
        userId: order.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: '주문 상태가 변경되었습니다.',
      data: updatedOrder,
    });
  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json(
      { success: false, error: '주문 상태 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id: id },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: '주문을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await prisma.order.delete({
      where: { id: id },
    });

    // 로그 기록
    await createLog({
      type: 'ADMIN',
      action: '주문 삭제',
      details: {
        orderNumber: order.orderNumber,
        userId: order.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: '주문이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Order deletion error:', error);
    return NextResponse.json(
      { success: false, error: '주문 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
