import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    return NextResponse.json({
      success: true,
      data: settings || {
        kakaotalkUrl: null,
        googleClientId: null,
        bankName: null,
        bankAccount: null,
        accountHolder: null,
      },
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { success: false, error: '설정을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();

    const settings = await prisma.settings.upsert({
      where: { id: 'settings' },
      update: data,
      create: {
        id: 'settings',
        ...data,
      },
    });

    return NextResponse.json({
      success: true,
      message: '설정이 저장되었습니다.',
      data: settings,
    });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { success: false, error: '설정 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
