import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyUserSession } from '@/lib/auth';

async function getUserId() {
  const token = (await cookies()).get('session')?.value;
  const userId = token ? await verifyUserSession(token) : null;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isBlacklisted: true } });
  return user?.isBlacklisted ? null : userId;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    const cartItems = await prisma.cartItem.findMany({ where: { userId }, include: { product: { include: { options: true } }, option: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: cartItems });
  } catch (error) {
    console.error('Cart fetch error:', error);
    return NextResponse.json({ success: false, error: '장바구니를 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    const body = await request.json() as { productId?: unknown; optionId?: unknown; quantity?: unknown };
    const productId = typeof body.productId === 'string' ? body.productId : '';
    const optionId = body.optionId === null || body.optionId === undefined ? null : typeof body.optionId === 'string' ? body.optionId : '';
    const quantity = Number(body.quantity);
    if (!productId || optionId === '' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
      return NextResponse.json({ success: false, error: '상품, 옵션, 수량을 확인해주세요.' }, { status: 400 });
    }
    const product = await prisma.product.findFirst({ where: { id: productId, isVisible: true, isDraft: false }, include: { options: true } });
    if (!product) return NextResponse.json({ success: false, error: '판매 중인 상품을 찾을 수 없습니다.' }, { status: 404 });
    const option = optionId ? product.options.find((item) => item.id === optionId) : null;
    if (optionId && !option) return NextResponse.json({ success: false, error: '상품 옵션을 찾을 수 없습니다.' }, { status: 400 });
    if (option && option.stock < quantity) return NextResponse.json({ success: false, error: '재고가 부족합니다.' }, { status: 409 });
    const existingItem = await prisma.cartItem.findFirst({ where: { userId, productId, optionId } });
    if (existingItem && existingItem.quantity + quantity > 999) return NextResponse.json({ success: false, error: '최대 수량을 초과했습니다.' }, { status: 400 });
    const cartItem = existingItem
      ? await prisma.cartItem.update({ where: { id: existingItem.id }, data: { quantity: { increment: quantity } }, include: { product: true, option: true } })
      : await prisma.cartItem.create({ data: { userId, productId, optionId, quantity }, include: { product: true, option: true } });
    return NextResponse.json({ success: true, data: cartItem });
  } catch (error) {
    console.error('Cart add error:', error);
    return NextResponse.json({ success: false, error: '장바구니 추가 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    const body = await request.json() as { id?: unknown; quantity?: unknown };
    const id = typeof body.id === 'string' ? body.id : '';
    const quantity = Number(body.quantity);
    if (!id || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) return NextResponse.json({ success: false, error: '수량을 확인해주세요.' }, { status: 400 });
    const item = await prisma.cartItem.findFirst({ where: { id, userId }, include: { option: true } });
    if (!item) return NextResponse.json({ success: false, error: '장바구니 상품을 찾을 수 없습니다.' }, { status: 404 });
    if (item.option && item.option.stock < quantity) return NextResponse.json({ success: false, error: '재고가 부족합니다.' }, { status: 409 });
    const updated = await prisma.cartItem.update({ where: { id }, data: { quantity }, include: { product: true, option: true } });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Cart update error:', error);
    return NextResponse.json({ success: false, error: '장바구니 수량 변경 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: '장바구니 아이템 ID가 필요합니다.' }, { status: 400 });
    const deleted = await prisma.cartItem.deleteMany({ where: { id, userId } });
    if (!deleted.count) return NextResponse.json({ success: false, error: '장바구니 상품을 찾을 수 없습니다.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cart delete error:', error);
    return NextResponse.json({ success: false, error: '장바구니 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
