import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LogType } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '인증되지 않았습니다.' },
        { status: 401 }
      );
    }

    const userId = await verifyUserSession(sessionToken);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '세션이 만료되었습니다.' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Delete the user and all related data within a transaction
    await prisma.$transaction(async (tx) => {
      // Record the withdrawal action (audit log) before deleting user data
      await tx.log.create({
        data: {
          type: LogType.USER,
          userId,
          email: user.email,
          action: '회원 탈퇴',
          details: { name: user.name },
          ipAddress: ip,
          userAgent,
        },
      });

      // Delete all sessions (including the current one)
      await tx.session.deleteMany({ where: { userId } });

      // Delete all cart items
      await tx.cartItem.deleteMany({ where: { userId } });

      // Delete all order items belonging to the user's orders
      await tx.orderItem.deleteMany({
        where: {
          order: { userId },
        },
      });

      // Delete all orders
      await tx.order.deleteMany({ where: { userId } });

      // Nullify all remaining log entries referencing this user
      await tx.log.updateMany({
        where: { userId },
        data: { userId: null },
      });

      // Delete the user record
      await tx.user.delete({ where: { id: userId } });
    });

    // Clear the session cookie
    cookieStore.delete('session');

    return NextResponse.json({
      success: true,
      message: '회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.',
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { success: false, error: '회원 탈퇴 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
