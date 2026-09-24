import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyUserSession } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// verifyUserSession already checks isBlacklisted and deletes expired sessions,
// so a separate user.isBlacklisted query is redundant here.
async function getUserId() {
  const token = (await cookies()).get('session')?.value;
  const userId = token ? await verifyUserSession(token) : null;
  return userId;
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: { include: { options: true } }, option: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, data: cartItems });
  } catch (error) {
    console.error('Cart fetch error:', error);
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? `장바구니를 불러오는 중 데이터베이스 오류가 발생했습니다 (코드: ${error.code}).`
        : '장바구니를 불러오는 중 오류가 발생했습니다.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    const body = await request.json() as { productId?: unknown; optionId?: unknown; quantity?: unknown };
    const productId = typeof body.productId === 'string' ? body.productId : '';
    const optionId =
      body.optionId === null || body.optionId === undefined
        ? null
        : typeof body.optionId === 'string'
        ? body.optionId
        : '';
    const quantity = Number(body.quantity);
    if (!productId || optionId === '' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
      return NextResponse.json({ success: false, error: '상품, 옵션, 수량을 확인해주세요.' }, { status: 400 });
    }

    // Wrap product validation + cart update in a transaction with ReadCommitted isolation
    // to ensure atomicity without the overhead of Serializable.
    const cartItem = await prisma.$transaction(
      async (tx) => {
        // Use select to fetch only needed fields instead of the full product record.
        const product = await tx.product.findUnique({
          where: { id: productId, isVisible: true, isDraft: false },
          select: {
            id: true,
            salePrice: true,
            options: { select: { id: true, stock: true } },
          },
        });
        if (!product) throw new Error('PRODUCT_NOT_FOUND');

        if (optionId) {
          const option = product.options.find((item) => item.id === optionId);
          if (!option) throw new Error('OPTION_NOT_FOUND');
          if (option.stock < quantity) throw new Error('OUT_OF_STOCK');
        }

        const existingItem = await tx.cartItem.findFirst({ where: { userId, productId, optionId } });
        if (existingItem && existingItem.quantity + quantity > 999) throw new Error('QUANTITY_LIMIT');

        const item = existingItem
          ? await tx.cartItem.update({
              where: { id: existingItem.id },
              data: { quantity: { increment: quantity } },
              include: { product: true, option: true },
            })
          : await tx.cartItem.create({
              data: { userId, productId, optionId, quantity },
              include: { product: true, option: true },
            });
        return item;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    return NextResponse.json({ success: true, data: cartItem });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error during cart add:', {
        code: error.code,
        meta: error.meta,
      });
      return NextResponse.json(
        { success: false, error: `장바구니 추가 중 데이터베이스 오류가 발생했습니다 (코드: ${error.code}).` },
        { status: 500 },
      );
    }

    const errorCode = error instanceof Error ? error.message : '';
    const messages: Record<string, [string, number]> = {
      PRODUCT_NOT_FOUND: ['판매 중인 상품을 찾을 수 없습니다.', 404],
      OPTION_NOT_FOUND: ['상품 옵션을 찾을 수 없습니다.', 400],
      OUT_OF_STOCK: ['재고가 부족합니다.', 409],
      QUANTITY_LIMIT: ['최대 수량을 초과했습니다.', 400],
    };
    if (messages[errorCode]) {
      const [message, status] = messages[errorCode];
      return NextResponse.json({ success: false, error: message }, { status });
    }

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
    if (!id || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999)
      return NextResponse.json({ success: false, error: '수량을 확인해주세요.' }, { status: 400 });

    const item = await prisma.cartItem.findFirst({ where: { id, userId }, select: { option: { select: { stock: true } } } });
    if (!item) return NextResponse.json({ success: false, error: '장바구니 상품을 찾을 수 없습니다.' }, { status: 404 });
    if (item.option && item.option.stock < quantity)
      return NextResponse.json({ success: false, error: '재고가 부족합니다.' }, { status: 409 });

    const updated = await prisma.cartItem.update({ where: { id }, data: { quantity }, include: { product: true, option: true } });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error during cart update:', { code: error.code, meta: error.meta });
      return NextResponse.json(
        { success: false, error: `장바구니 수량 변경 중 데이터베이스 오류가 발생했습니다 (코드: ${error.code}).` },
        { status: 500 },
      );
    }
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error during cart delete:', { code: error.code, meta: error.meta });
      return NextResponse.json(
        { success: false, error: `장바구니 삭제 중 데이터베이스 오류가 발생했습니다 (코드: ${error.code}).` },
        { status: 500 },
      );
    }
    console.error('Cart delete error:', error);
    return NextResponse.json({ success: false, error: '장바구니 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
