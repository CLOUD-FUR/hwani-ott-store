import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminUsername } from '@/lib/admin-auth';

export async function GET() {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
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
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
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
          minPurchase: tier.minPurchase ?? 0,
          benefits: tier.benefits,
        },
        create: {
          tier: tier.tier,
          discountRate: tier.discountRate,
          minPurchase: tier.minPurchase ?? 0,
          benefits: tier.benefits,
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
