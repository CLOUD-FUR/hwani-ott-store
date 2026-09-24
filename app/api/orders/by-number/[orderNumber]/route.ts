import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyUserSession } from '@/lib/auth';

// Look up an order by its (public) orderNumber.
// Returns the order only when it belongs to the logged-in user.
// - No session -> 401
// - Another user's order -> 403
// - Not found -> 404
export async function GET(_request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  try {
    const sessionToken = (await cookies()).get('session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const userId = await verifyUserSession(sessionToken);
    if (!userId) {
      return NextResponse.json({ success: false, error: '세션이 만료되었습니다.' }, { status: 401 });
    }

    const { orderNumber } = await params;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        orderItems: {
          include: {
            product: { select: { name: true, images: true, salePrice: true } },
            option: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 });
    }

    if (order.userId !== userId) {
      return NextResponse.json({ success: false, error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Order lookup by number error:', error);
    return NextResponse.json({ success: false, error: '주문 정보를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
