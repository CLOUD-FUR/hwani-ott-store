import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

async function getGoogleSettings() {
  let googleClientId = process.env.GOOGLE_CLIENT_ID;
  let redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!googleClientId || !redirectUri) {
    try {
      const settings = await prisma.settings.findUnique({ where: { id: 'settings' } });
      googleClientId ||= settings?.googleClientId || undefined;
      redirectUri ||= settings?.googleRedirectUri || undefined;
    } catch {
      // Continue without database settings
    }
  }

  return { googleClientId, redirectUri };
}

export async function GET(request: Request) {
  try {
    const { googleClientId, redirectUri } = await getGoogleSettings();

    if (!googleClientId || !redirectUri) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google OAuth가 설정되지 않았습니다. 환경 변수를 확인해주세요.',
        },
        { status: 503 }
      );
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', googleClientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');
    googleAuthUrl.searchParams.set('state', state);

    const response = NextResponse.redirect(googleAuthUrl);

    // Store state in cookie for validation in callback
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google auth URL error:', error);
    return NextResponse.json(
      { success: false, error: 'Google 로그인 URL을 생성하지 못했습니다.' },
      { status: 500 }
    );
  }
}
