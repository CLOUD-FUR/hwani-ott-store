import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLog } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: '이메일과 인증 코드를 입력해주세요.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (user.isVerified) {
      return NextResponse.json(
        { success: false, error: '이미 인증된 계정입니다.' },
        { status: 400 }
      );
    }

    if (!user.verifyToken || !user.verifyExpires) {
      return NextResponse.json(
        { success: false, error: '인증 코드가 존재하지 않습니다.' },
        { status: 400 }
      );
    }

    if (user.verifyExpires < new Date()) {
      return NextResponse.json(
        { success: false, error: '인증 코드가 만료되었습니다. 다시 요청해주세요.' },
        { status: 400 }
      );
    }

    if (user.verifyToken !== code) {
      return NextResponse.json(
        { success: false, error: '인증 코드가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verifyToken: null,
        verifyExpires: null,
      },
    });

    await createLog({
      type: 'SIGNUP',
      userId: user.id,
      email: user.email,
      action: '이메일 인증 완료',
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: '이메일 인증이 완료되었습니다.',
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { success: false, error: '인증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
