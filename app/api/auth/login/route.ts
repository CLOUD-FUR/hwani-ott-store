import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createUserSession, checkRateLimit } from '@/lib/auth';
import { createLog } from '@/lib/logger';
import { Prisma } from '@prisma/client';

// Fire-and-forget helper: runs a promise in the background without blocking the response.
function fireAndForget(promise: Promise<unknown>, label: string): void {
  promise.catch((error) => {
    console.error(`Background task error [${label}]:`, error);
  });
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || undefined;
  let userEmail: string | undefined;

  try {
    const { email, password } = await request.json();

    // Rate limiting: 10 attempts per IP per hour
    const canProceed = await checkRateLimit(`login:${ip}`, 10, 60 * 60 * 1000);
    if (!canProceed) {
      return NextResponse.json(
        { success: false, error: '너무 많은 로그인 시도가 있었습니다. 나중에 다시 시도해주세요.' },
        { status: 429 },
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '이메일과 비밀번호를 입력해주세요.' },
        { status: 400 },
      );
    }

    // Select only the fields actually needed to reduce query payload
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        uniqueId: true,
        tier: true,
        provider: true,
        isVerified: true,
        isBlacklisted: true,
      },
    });

    userEmail = user?.email;

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: '이메일 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 },
      );
    }

    if (user.isBlacklisted) {
      fireAndForget(
        createLog({
          type: 'LOGIN',
          userId: user.id,
          email: user.email,
          action: '차단된 계정 로그인 시도',
          ipAddress: ip,
          userAgent,
        }),
        'login-blacklist-log',
      );

      return NextResponse.json(
        { success: false, error: '차단된 계정입니다. 관리자에게 문의하세요.' },
        { status: 403 },
      );
    }

    if (!user.isVerified) {
      return NextResponse.json(
        { success: false, error: '이메일 인증이 필요합니다. 이메일을 확인해주세요.' },
        { status: 403 },
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: '이메일 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 },
      );
    }

    // Create session
    const sessionToken = await createUserSession(user.id);

    // Fire-and-forget: logging does not block the login response
    fireAndForget(
      createLog({
        type: 'LOGIN',
        userId: user.id,
        email: user.email,
        action: '로그인',
        ipAddress: ip,
        userAgent,
      }),
      'login-log',
    );

    const response = NextResponse.json({
      success: true,
      message: '로그인 성공',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          uniqueId: user.uniqueId,
          tier: user.tier,
          provider: user.provider,
        },
      },
    });

    // Set HttpOnly cookie
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error during login:', { code: error.code, meta: error.meta, email: userEmail });
      return NextResponse.json(
        { success: false, error: `로그인 중 데이터베이스 오류가 발생했습니다 (코드: ${error.code}).` },
        { status: 500 },
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error('Database initialization error during login:', { message: error.message, email: userEmail });
      return NextResponse.json(
        { success: false, error: '데이터베이스 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 },
      );
    }

    console.error('Login error:', { error, email: userEmail });
    return NextResponse.json(
      { success: false, error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
