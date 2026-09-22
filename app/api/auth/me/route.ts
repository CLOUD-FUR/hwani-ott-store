import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
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
      select: {
        id: true,
        email: true,
        name: true,
        uniqueId: true,
        tier: true,
        provider: true,
        isVerified: true,
        isBlacklisted: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (user.isBlacklisted) {
      return NextResponse.json(
        { success: false, error: '차단된 계정입니다.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { success: false, error: '사용자 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
