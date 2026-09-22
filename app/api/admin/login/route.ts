import { NextResponse } from 'next/server';
import { createAdminSession } from '@/lib/auth';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: '아이디 또는 비밀번호가 일치하지 않습니다.' },
        { status: 401 }
      );
    }

    // 로그인 성공
    const sessionToken = await createAdminSession(username);
    const response = NextResponse.json({
      success: true,
      message: '관리자 로그인 성공',
      data: {
        isAdmin: true,
        username: ADMIN_USERNAME,
      },
    });

    // 쿠키에 관리자 세션 저장
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7일
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, error: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
