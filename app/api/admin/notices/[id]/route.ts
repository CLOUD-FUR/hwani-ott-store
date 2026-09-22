import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLog } from '@/lib/logger';
import { getAdminUsername } from '@/lib/admin-auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const { id } = await params;
    const { title, content, link, isActive, startDate, endDate } = await request.json();

    const notice = await prisma.notice.findUnique({
      where: { id: id },
    });

    if (!notice) {
      return NextResponse.json(
        { success: false, error: '공지사항을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const updatedNotice = await prisma.notice.update({
      where: { id: id },
      data: {
        title,
        content,
        link,
        isActive,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    // 로그 기록
    await createLog({
      type: 'ADMIN',
      action: '공지사항 수정',
      details: {
        noticeId: notice.id,
        title: updatedNotice.title,
      },
    });

    return NextResponse.json({
      success: true,
      message: '공지사항이 수정되었습니다.',
      data: updatedNotice,
    });
  } catch (error) {
    console.error('Notice update error:', error);
    return NextResponse.json(
      { success: false, error: '공지사항 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const { id } = await params;
    const notice = await prisma.notice.findUnique({
      where: { id: id },
    });

    if (!notice) {
      return NextResponse.json(
        { success: false, error: '공지사항을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await prisma.notice.delete({
      where: { id: id },
    });

    // 로그 기록
    await createLog({
      type: 'ADMIN',
      action: '공지사항 삭제',
      details: {
        noticeId: notice.id,
        title: notice.title,
      },
    });

    return NextResponse.json({
      success: true,
      message: '공지사항이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('Notice deletion error:', error);
    return NextResponse.json(
      { success: false, error: '공지사항 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
