import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
      select: {
        siteName: true,
        siteDescription: true,
        kakaotalkUrl: true,
        channelTalkUrl: true,
        bankName: true,
        bankAccount: true,
        accountHolder: true,
      },
    });
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ success: false, error: '설정을 불러오는 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
