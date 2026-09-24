import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const q = searchParams.get('q');

    const where: Record<string, unknown> = { isVisible: true, isDraft: false };

    if (category) {
      where.category = category;
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { keywords: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [products, categoriesResult] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { options: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
      }),
      prisma.product.findMany({
        where: { isVisible: true, isDraft: false, category: { not: null } },
        select: { category: true },
        distinct: ['category'],
      }),
    ]);

    const categories = Array.from(new Set(categoriesResult.map((p) => p.category).filter(Boolean)));

    return NextResponse.json({ success: true, products, data: products, categories });
  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json(
      { success: false, error: '상품을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
