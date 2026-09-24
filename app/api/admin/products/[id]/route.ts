import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminUsername } from '@/lib/admin-auth';
import { createLog } from '@/lib/logger';
import { LogType } from '@prisma/client';

type InputOption = { name: string; price?: number; stock?: number };
type ProductInput = { name?: string; description?: string; images?: string[]; image?: string; originalPrice?: number; salePrice?: number; price?: number; isVisible?: boolean; isAvailable?: boolean; isDraft?: boolean; order?: number; category?: string | null; keywords?: string | null; options?: InputOption[] };

function present(product: { images: string[]; salePrice: number; isVisible: boolean } & Record<string, unknown>) {
  return { ...product, image: product.images[0] || '', price: product.salePrice, isAvailable: product.isVisible };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, include: { options: { orderBy: { order: 'asc' } } } });
  if (!product) return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json({ success: true, data: present(product) });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUsername();
  if (!admin) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  try {
    const input = await request.json() as ProductInput;
    const current = await prisma.product.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ success: false, error: '상품을 찾을 수 없습니다.' }, { status: 404 });
    const images = Array.isArray(input.images) ? input.images : input.image !== undefined ? (input.image ? [input.image] : []) : current.images;
    const data = {
      name: input.name?.trim() || current.name,
      description: input.description?.trim() || current.description,
      images,
      originalPrice: Number(input.originalPrice ?? input.price ?? current.originalPrice),
      salePrice: Number(input.salePrice ?? input.price ?? current.salePrice),
      isVisible: input.isVisible ?? input.isAvailable ?? current.isVisible,
      isDraft: input.isDraft ?? current.isDraft,
      order: Number(input.order ?? current.order),
      category: input.category !== undefined ? (input.category?.trim() || null) : current.category,
      keywords: input.keywords !== undefined ? (input.keywords?.trim() || null) : current.keywords,
    };
    const product = await prisma.$transaction(async (tx) => {
      if (input.options) await tx.productOption.deleteMany({ where: { productId: id } });
      return tx.product.update({ where: { id }, data: { ...data, ...(input.options ? { options: { create: input.options.map((option, index) => ({ name: option.name.trim(), price: Number(option.price ?? 0), stock: Number(option.stock ?? 999), order: index })) } } : {}) }, include: { options: true } });
    });
    await createLog({ type: LogType.PRODUCT, action: '상품 수정', details: { productId: id, admin } });
    return NextResponse.json({ success: true, data: present(product) });
  } catch (error) {
    console.error('Admin product update error:', error);
    return NextResponse.json({ success: false, error: '상품 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUsername();
  if (!admin) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    await createLog({ type: LogType.PRODUCT, action: '상품 삭제', details: { productId: id, admin } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin product deletion error:', error);
    return NextResponse.json({ success: false, error: '상품 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
