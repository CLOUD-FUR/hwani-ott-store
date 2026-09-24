import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createLog } from '@/lib/logger';

export async function PATCH(request: Request) {
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

    const body = await request.json() as { name?: unknown };
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json(
        { success: false, error: '이름을 입력해주세요.' },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { success: false, error: '이름은 50자를 초과할 수 없습니다.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name },
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

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    await createLog({
      type: 'MODIFY',
      userId,
      email: user.email,
      action: '프로필 이름 수정',
      details: { name },
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: '프로필 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
