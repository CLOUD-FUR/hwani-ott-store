import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const notices = await prisma.notice.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, notices, data: notices });
  } catch (error) {
    console.error('Notices fetch error:', error);
    return NextResponse.json(
      { success: false, error: '공지사항을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
