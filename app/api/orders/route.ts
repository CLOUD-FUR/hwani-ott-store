import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, generateOrderNumber } from '@/lib/auth';
import { sendOrderConfirmationEmail } from '@/lib/email';
import { createLog } from '@/lib/logger';

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

    const { items, depositorName } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: '주문 상품이 없습니다.' },
        { status: 400 }
      );
    }

    if (!depositorName) {
      return NextResponse.json(
        { success: false, error: '입금자명을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사용자 정보 가져오기
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 24시간 내 주문 개수 확인
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentOrdersCount = await prisma.order.count({
      where: {
        userId: decoded.userId,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (recentOrdersCount >= 10) {
      return NextResponse.json(
        { success: false, error: '24시간 내 최대 10개의 주문만 가능합니다.' },
        { status: 429 }
      );
    }

    // 등급별 할인율 가져오기
    const tierConfig = await prisma.tierConfig.findUnique({
      where: { tier: user.tier },
    });

    const discountRate = tierConfig?.discountRate || 0;

    // 총 금액 계산
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { options: true },
      });

      if (!product) {
        return NextResponse.json(
          { success: false, error: `상품을 찾을 수 없습니다: ${item.productId}` },
          { status: 404 }
        );
      }

      let price = product.salePrice;

      if (item.optionId) {
        const option = product.options.find((opt: { id: string; price: number }) => opt.id === item.optionId);
        if (option) {
          price += option.price;
        }
      }

      const discount = Math.floor(price * discountRate / 100);
      const finalPrice = price - discount;

      totalAmount += finalPrice * item.quantity;

      orderItemsData.push({
        productId: item.productId,
        optionId: item.optionId || null,
        quantity: item.quantity,
        price: finalPrice,
        discount,
      });
    }

    // 주문 번호 생성
    const userOrdersCount = await prisma.order.count({
      where: { userId: decoded.userId },
    });

    const orderNumber = generateOrderNumber(user.uniqueId, userOrdersCount);

    // 계좌 정보 가져오기
    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    const accountInfo = {
      bankName: settings?.bankName || '미설정',
      bankAccount: settings?.bankAccount || '미설정',
      accountHolder: settings?.accountHolder || '미설정',
    };

    // 주문 생성
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: decoded.userId,
        userEmail: user.email,
        depositorName,
        totalAmount,
        accountInfo,
        orderItems: {
          create: orderItemsData,
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
            option: true,
          },
        },
      },
    });

    // 장바구니 비우기
    await prisma.cartItem.deleteMany({
      where: {
        userId: decoded.userId,
        productId: { in: items.map((item: any) => item.productId) },
      },
    });

    // 주문 확인 이메일 발송
    try {
      await sendOrderConfirmationEmail(user.email, orderNumber, { totalAmount, items: orderItemsData, createdAt: new Date() });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    // 로그 기록
    await createLog({
      type: 'purchase',
      userId: user.id,
      email: user.email,
      action: '주문 생성',
      details: {
        orderNumber,
        totalAmount,
        itemCount: items.length,
        tier: user.tier,
        discountRate,
      },
    });

    return NextResponse.json({
      success: true,
      message: '주문이 접수되었습니다.',
      data: order,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { success: false, error: '주문 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

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

    const orders = await prisma.order.findMany({
      where: { userId: decoded.userId },
      include: {
        orderItems: {
          include: {
            product: true,
            option: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { success: false, error: '주문 내역을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
