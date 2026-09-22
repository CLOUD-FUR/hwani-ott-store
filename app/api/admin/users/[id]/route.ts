import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createLog } from '@/lib/logger';
import { getAdminUsername } from '@/lib/admin-auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, uniqueId: true, provider: true, tier: true, isVerified: true, isBlacklisted: true, blacklistReason: true, createdAt: true, orders: { orderBy: { createdAt: 'desc' }, include: { orderItems: { include: { product: { select: { name: true } }, option: true } } } }, logs: { orderBy: { createdAt: 'desc' }, take: 50 } } });
  if (!user) return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
  const completedTotal = user.orders.filter((order) => order.status === 'COMPLETED').reduce((sum, order) => sum + order.totalAmount, 0);
  return NextResponse.json({ success: true, data: { ...user, completedTotal } });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminUsername()) return NextResponse.json({ success: false, error: '관리자 로그인이 필요합니다.' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json() as { tier?: unknown; isBlacklisted?: unknown; blacklistReason?: unknown };
    const { tier, isBlacklisted, blacklistReason } = body;
    const validTiers = ['USER', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
    if (tier !== undefined && (typeof tier !== 'string' || !validTiers.includes(tier))) return NextResponse.json({ success: false, error: '유효하지 않은 등급입니다.' }, { status: 400 });
    if (isBlacklisted === true && (typeof blacklistReason !== 'string' || !blacklistReason.trim())) return NextResponse.json({ success: false, error: '차단 사유를 입력해주세요.' }, { status: 400 });

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
        tier: tier !== undefined ? tier as Role : user.tier,
        isBlacklisted: isBlacklisted !== undefined ? Boolean(isBlacklisted) : user.isBlacklisted,
        blacklistReason: isBlacklisted === false ? null : typeof blacklistReason === 'string' ? blacklistReason.trim() : user.blacklistReason,
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
