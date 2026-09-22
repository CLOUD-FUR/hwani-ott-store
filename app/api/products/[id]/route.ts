import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        options: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: '상품을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 클릭 수 증가
    await prisma.product.update({
      where: { id },
      data: { clicks: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      data: product,
      product,
    });
  } catch (error) {
    console.error('Product fetch error:', error);
    return NextResponse.json(
      { success: false, error: '상품을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    // 기존 옵션 삭제
    await prisma.productOption.deleteMany({
      where: { productId: id },
    });

    // 상품 업데이트
    const product = await prisma.product.update({
      where: { id: id },
      data: {
        name: data.name,
        description: data.description,
        images: data.images,
        originalPrice: data.originalPrice,
        salePrice: data.salePrice,
        isVisible: data.isVisible,
        isDraft: data.isDraft,
        order: data.order,
        options: {
          create: data.options?.map((opt: { name: string; price: number; stock?: number }, idx: number) => ({
            name: opt.name,
            price: opt.price,
            stock: opt.stock ?? 999,
            order: idx,
          })) || [],
        },
      },
      include: {
        options: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: '상품이 수정되었습니다.',
      data: product,
      product,
    });
  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json(
      { success: false, error: '상품 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: '상품이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Product deletion error:', error);
    return NextResponse.json(
      { success: false, error: '상품 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
