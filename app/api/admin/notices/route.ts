import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLog } from '@/lib/logger';

export async function GET() {
  try {
    const notices = await prisma.notice.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: notices,
    });
  } catch (error) {
    console.error('Admin notices fetch error:', error);
    return NextResponse.json(
      { success: false, error: '공지사항을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { title, content, link, isActive, startDate, endDate } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '제목과 내용을 입력해주세요.' },
        { status: 400 }
      );
    }

    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        link,
        isActive: isActive ?? true,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    // 로그 기록
    await createLog({
      type: 'admin',
      action: '공지사항 생성',
      details: {
        noticeId: notice.id,
        title: notice.title,
      },
    });

    return NextResponse.json({
      success: true,
      message: '공지사항이 생성되었습니다.',
      data: notice,
    });
  } catch (error) {
    console.error('Notice creation error:', error);
    return NextResponse.json(
      { success: false, error: '공지사항 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
