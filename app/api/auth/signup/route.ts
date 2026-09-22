import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateToken, generateUniqueId, generateVerifyCode } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { createLog } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // 유효성 검사
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '이미 사용 중인 이메일입니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 고유 ID 생성 (5자리 숫자)
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

    // 인증 코드 생성
    const verifyToken = generateVerifyCode();

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        uniqueId,
        verifyToken,
        provider: 'email',
      },
    });

    // 인증 이메일 발송
    try {
      await sendVerificationEmail(email, verifyToken);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // 이메일 발송 실패해도 회원가입은 진행
    }

    // 로그 기록
    await createLog({
      type: 'signup',
      userId: user.id,
      email: user.email,
      action: '이메일 회원가입',
      details: { uniqueId, provider: 'email' },
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
