import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminUsername } from '@/lib/admin-auth';
import { createLog } from '@/lib/logger';
import { LogType } from '@prisma/client';

type ProductInput = {
  name?: string;
  description?: string;
  images?: string[];
  image?: string;
  originalPrice?: number;
  salePrice?: number;
  price?: number;
  isVisible?: boolean;
  isAvailable?: boolean;
  isDraft?: boolean;
  order?: number;
  category?: string | null;
  keywords?: string | null;
  options?: Array<{ name: string; price?: number; stock?: number }>;
};

function normalize(input: ProductInput) {
  const images = Array.isArray(input.images) ? input.images : input.image ? [input.image] : [];
  return {
    name: input.name?.trim() || '',
    description: input.description?.trim() || '',
    images,
    originalPrice: Math.max(0, Number(input.originalPrice ?? input.price ?? 0)),
    salePrice: Math.max(0, Number(input.salePrice ?? input.price ?? 0)),
    isVisible: input.isVisible ?? input.isAvailable ?? true,
    isDraft: input.isDraft ?? false,
    order: Number(input.order ?? 0),
    category: input.category?.trim() || null,
    keywords: input.keywords?.trim() || null,
    options: Array.isArray(input.options) ? input.options : [],
  };
}

function present(product: Awaited<ReturnType<typeof prisma.product.findUnique>>) {
  if (!product) return product;
  return { ...product, image: product.images[0] || '', price: product.salePrice, isAvailable: product.isVisible };
}

export async function GET() {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const products = await prisma.product.findMany({ include: { options: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } });
    return NextResponse.json({ success: true, data: products.map(present) });
  } catch (error) {
    console.error('Admin products fetch error:', error);
    return NextResponse.json({ success: false, error: '상품을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getAdminUsername();
  if (!admin) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const input = normalize(await request.json() as ProductInput);
    if (!input.name || !input.description || !Number.isFinite(input.salePrice)) {
      return NextResponse.json({ success: false, error: '상품명, 설명, 판매가를 입력해주세요.' }, { status: 400 });
    }
    const product = await prisma.product.create({
      data: {
        name: input.name, description: input.description, images: input.images,
        originalPrice: input.originalPrice, salePrice: input.salePrice,
        isVisible: input.isVisible, isDraft: input.isDraft, order: input.order,
        category: input.category, keywords: input.keywords,
        options: { create: input.options.map((option, index) => ({ name: option.name.trim(), price: Number(option.price ?? 0), stock: Number(option.stock ?? 999), order: index })) },
      }, include: { options: true },
    });
    await createLog({ type: LogType.PRODUCT, action: '상품 생성', details: { productId: product.id, admin } });
    return NextResponse.json({ success: true, data: present(product) }, { status: 201 });
  } catch (error) {
    console.error('Admin product creation error:', error);
    return NextResponse.json({ success: false, error: '상품 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
