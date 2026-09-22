import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 'settings' },
    });

    if (!settings?.googleClientId) {
      return NextResponse.json(
        { success: false, error: 'Google 로그인이 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const redirectUri = settings.googleRedirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', settings.googleClientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');

    return NextResponse.redirect(googleAuthUrl.toString());
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Google 로그인 URL 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
