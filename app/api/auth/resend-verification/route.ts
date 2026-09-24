import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { generateVerifyCode, checkRateLimit } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { createLog } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    if (!email) {
      return NextResponse.json(
        { success: false, error: '이메일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // Rate limiting: 3 resends per email+IP per 10 minutes
    const canProceed = await checkRateLimit(`resend:${ip}:${email}`, 3, 10 * 60 * 1000);
    if (!canProceed) {
      return NextResponse.json(
        { success: false, error: '인증 코드 재발송이 너무 잦습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Do not leak whether an account exists beyond what signup already reveals.
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { success: false, error: '이미 인증된 계정입니다. 로그인해주세요.' },
        { status: 400 }
      );
    }

    if (user.provider === 'google') {
      return NextResponse.json(
        { success: false, error: 'Google 계정은 이메일 인증이 필요하지 않습니다.' },
        { status: 400 }
      );
    }

    const verifyToken = generateVerifyCode();
    const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verifyToken: verifyTokenHash,
        verifyExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    try {
      await sendVerificationEmail(email, verifyToken);
    } catch (emailError) {
      console.error('Resend verification email failed:', emailError);
      return NextResponse.json(
        { success: false, error: '인증 이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 502 }
      );
    }

    await createLog({
      type: 'SIGNUP',
      userId: user.id,
      email: user.email,
      action: '이메일 인증 코드 재발송',
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: '인증 코드를 다시 발송했습니다. 이메일을 확인해주세요.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { success: false, error: '인증 코드 재발송 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
