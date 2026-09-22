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
    const { tier, isBlacklisted } = await request.json();

    const user = await prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: {
        tier: tier !== undefined ? tier : user.tier,
        isBlacklisted: isBlacklisted !== undefined ? isBlacklisted : user.isBlacklisted,
      },
    });

    // 로그 기록
    await createLog({
      type: 'ADMIN',
      action: '사용자 정보 수정',
      details: {
        userId: user.id,
        email: user.email,
        changes: {
          tier: tier !== undefined ? { from: user.tier, to: tier } : undefined,
          isBlacklisted: isBlacklisted !== undefined ? { from: user.isBlacklisted, to: isBlacklisted } : undefined,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: '사용자 정보가 수정되었습니다.',
      data: updatedUser,
    });
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json(
      { success: false, error: '사용자 정보 수정 중 오류가 발생했습니다.' },
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
    const user = await prisma.user.findUnique({
      where: { id: id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id: id },
    });

    // 로그 기록
    await createLog({
      type: 'ADMIN',
      action: '사용자 삭제',
      details: {
        userId: user.id,
        email: user.email,
        uniqueId: user.uniqueId,
      },
    });

    return NextResponse.json({
      success: true,
      message: '사용자가 삭제되었습니다.',
    });
  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json(
      { success: false, error: '사용자 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
