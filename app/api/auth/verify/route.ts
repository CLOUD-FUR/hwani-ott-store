import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLog } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: '이메일과 인증번호를 입력해주세요.' },
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

    if (user.verifyToken !== code) {
      return NextResponse.json(
        { success: false, error: '인증번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }

    // 인증 완료
    await prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        verifyToken: null,
      },
    });

    // 로그 기록
    await createLog({
      type: 'verify',
      userId: user.id,
      email: user.email,
      action: '이메일 인증 완료',
    });

    return NextResponse.json({
      success: true,
      message: '이메일 인증이 완료되었습니다.',
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { success: false, error: '인증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
