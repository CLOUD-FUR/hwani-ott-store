import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyUserSession } from '@/lib/auth';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get('session')?.value;
  const userId = token ? await verifyUserSession(token) : null;
  if (!userId) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  const order = await prisma.order.findFirst({ where: { id, userId }, include: { orderItems: { include: { product: { select: { name: true, images: true } }, option: true } } } });
  if (!order) return NextResponse.json({ success: false, error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json({ success: true, data: order });
}
