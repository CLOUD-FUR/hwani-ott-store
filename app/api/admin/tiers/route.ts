import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tiers = await prisma.tierConfig.findMany({
      orderBy: { discountRate: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: tiers,
    });
  } catch (error) {
    console.error('Tiers fetch error:', error);
    return NextResponse.json(
      { success: false, error: '등급 정보를 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const tiers = await request.json();

    if (!Array.isArray(tiers)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 데이터입니다.' },
        { status: 400 }
      );
    }

    // 각 등급 업데이트
    const updates = tiers.map(tier =>
      prisma.tierConfig.upsert({
        where: { tier: tier.tier },
        update: {
          discountRate: tier.discountRate,
          description: tier.description,
        },
        create: {
          tier: tier.tier,
          discountRate: tier.discountRate,
          description: tier.description,
        },
      })
    );

    await Promise.all(updates);

    const updatedTiers = await prisma.tierConfig.findMany({
      orderBy: { discountRate: 'asc' },
    });

    return NextResponse.json({
      success: true,
      message: '등급 설정이 저장되었습니다.',
      data: updatedTiers,
    });
  } catch (error) {
    console.error('Tiers update error:', error);
    return NextResponse.json(
      { success: false, error: '등급 설정 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
