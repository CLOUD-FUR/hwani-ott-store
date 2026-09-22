import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: '인증되지 않았습니다.' },
        { status: 401 }
      );
    }

    const username = await verifyAdminSession(token);

    if (!username) {
      cookieStore.delete('admin_session');
      return NextResponse.json(
        { error: '세션이 만료되었습니다.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { username },
    });
  } catch (error) {
    console.error('Admin session verification error:', error);
    return NextResponse.json(
      { error: '세션 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
