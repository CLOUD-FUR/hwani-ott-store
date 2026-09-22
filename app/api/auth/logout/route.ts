import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteUserSession } from '@/lib/auth';
import { createLog } from '@/lib/logger';
import { verifyUserSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    if (sessionToken) {
      const userId = await verifyUserSession(sessionToken);

      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        await createLog({
          type: 'LOGIN',
          userId,
          email: user?.email,
          action: '로그아웃',
          ipAddress: ip,
          userAgent,
        });
      }

      await deleteUserSession(sessionToken);
    }

    const response = NextResponse.json({
      success: true,
      message: '로그아웃되었습니다.',
    });

    cookieStore.delete('session');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: '로그아웃 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
