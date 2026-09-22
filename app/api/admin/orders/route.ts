import { OrderStatus, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminUsername } from '@/lib/admin-auth';

export async function GET(request: Request) {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (status) {
      if (Object.values(OrderStatus).includes(status as OrderStatus)) where.status = status as OrderStatus;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              uniqueId: true,
              tier: true,
            },
          },
          orderItems: {
            include: {
              product: true,
              option: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Admin orders fetch error:', error);
    return NextResponse.json(
      { success: false, error: '주문 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
