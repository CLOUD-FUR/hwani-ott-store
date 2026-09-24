import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findFirst({
      where: { id, isVisible: true, isDraft: false },
      select: {
        id: true, name: true, description: true, images: true,
        originalPrice: true, salePrice: true, isVisible: true,
        options: { orderBy: { order: 'asc' }, select: { id: true, name: true, price: true, stock: true, order: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    }

    const presented = {
      ...product,
      image: product.images[0] || '',
      price: product.salePrice,
      isAvailable: product.isVisible,
    };

    await prisma.product.update({ where: { id }, data: { clicks: { increment: 1 } } });
    return NextResponse.json({ success: true, data: presented, product: presented });
  } catch (error) {
    console.error('Product fetch error:', error);
    return NextResponse.json({ success: false, error: '상품을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
