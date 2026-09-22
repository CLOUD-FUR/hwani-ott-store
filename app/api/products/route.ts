import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isVisible: true, isDraft: false },
      include: { options: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ success: true, products, data: products });
  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json(
      { success: false, error: '상품을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
