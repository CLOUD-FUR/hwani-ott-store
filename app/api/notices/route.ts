import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // 데이터베이스 연결 전까지 빈 배열 반환
    return NextResponse.json({
      success: true,
      notices: [],
    });
  } catch (error) {
    console.error('Notices fetch error:', error);
    return NextResponse.json(
      { success: false, error: '공지사항을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
