import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateUniqueId, generateVerifyCode, checkRateLimit } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { createLog } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: unknown; password?: unknown; name?: unknown; termsAccepted?: unknown };
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const termsAccepted = body.termsAccepted === true;
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Rate limiting: 5 attempts per IP per hour
    const canProceed = await checkRateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
    if (!canProceed) {
      return NextResponse.json(
        { success: false, error: '너무 많은 시도가 있었습니다. 나중에 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { success: false, error: '약관에 동의해 주세요.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 최소 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '이미 사용 중인 이메일입니다.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let uniqueId = generateUniqueId();
    let isUnique = false;

    while (!isUnique) {
      const existing = await prisma.user.findUnique({
        where: { uniqueId },
      });

      if (!existing) {
        isUnique = true;
      } else {
        uniqueId = generateUniqueId();
      }
    }

    const verifyToken = generateVerifyCode();
    const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');
    const verifyExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        uniqueId,
        verifyToken: verifyTokenHash,
        verifyExpires,
        provider: 'email',
      },
    });

    try {
      await sendVerificationEmail(email, verifyToken);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    await createLog({
      type: 'SIGNUP',
      userId: user.id,
      email: user.email,
      action: '이메일 회원가입',
      details: { uniqueId, provider: 'email' },
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
      data: {
        userId: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
