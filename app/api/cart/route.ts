import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: decoded.userId },
      include: {
        product: {
          include: {
            options: true,
          },
        },
        option: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: cartItems,
    });
  } catch (error) {
    console.error('Cart fetch error:', error);
    return NextResponse.json(
      { success: false, error: '장바구니를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    const { productId, optionId, quantity } = await request.json();

    // 기존 장바구니 아이템 확인
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        userId_productId_optionId: {
          userId: decoded.userId,
          productId,
          optionId: optionId || null,
        },
      },
    });

    let cartItem;

    if (existingItem) {
      // 수량 업데이트
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: {
          product: true,
          option: true,
        },
      });
    } else {
      // 새로 추가
      cartItem = await prisma.cartItem.create({
        data: {
          userId: decoded.userId,
          productId,
          optionId,
          quantity,
        },
        include: {
          product: true,
          option: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: '장바구니에 추가되었습니다.',
      data: cartItem,
    });
  } catch (error) {
    console.error('Cart add error:', error);
    return NextResponse.json(
      { success: false, error: '장바구니 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cartItemId = searchParams.get('id');

    if (!cartItemId) {
      return NextResponse.json(
        { success: false, error: '장바구니 아이템 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    await prisma.cartItem.delete({
      where: {
        id: cartItemId,
        userId: decoded.userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: '장바구니에서 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Cart delete error:', error);
    return NextResponse.json(
      { success: false, error: '장바구니 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
