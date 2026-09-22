import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const productionBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://www.xn--9i1b408a2kja054b.com';

async function getGoogleSettings() {
  // Production credentials belong in Vercel Environment Variables.
  // The database fallback keeps admin-configured settings supported later.
  let googleClientId = process.env.GOOGLE_CLIENT_ID;
  let redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!googleClientId || !redirectUri) {
    try {
      const settings = await prisma.settings?.findUnique({ where: { id: 'settings' } });
      googleClientId ||= settings?.googleClientId;
      redirectUri ||= settings?.googleRedirectUri;
    } catch {
      // The storefront can still report the missing OAuth configuration clearly.
    }
  }

  return {
    googleClientId,
    redirectUri: redirectUri || `${productionBaseUrl}/api/auth/google/callback`,
  };
}

export async function GET(request: Request) {
  try {
    const { googleClientId } = await getGoogleSettings();
    // Use the public host that handled this request so Vercel's www redirect
    // and Google's token exchange always use the exact same URI.
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const publicOrigin = forwardedHost
      ? `${forwardedProto || requestUrl.protocol.replace(':', '')}://${forwardedHost.split(',')[0].trim()}`
      : requestUrl.origin;
    const redirectUri = new URL('/api/auth/google/callback', publicOrigin).toString();

    if (!googleClientId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Client ID가 아직 설정되지 않았습니다. Vercel Production 환경 변수에 GOOGLE_CLIENT_ID를 추가하세요.',
        },
        { status: 503 }
      );
    }

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', googleClientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');

    return NextResponse.redirect(googleAuthUrl);
  } catch (error) {
    console.error('Google auth URL error:', error);
    return NextResponse.json(
      { success: false, error: 'Google 로그인 URL을 생성하지 못했습니다.' },
      { status: 500 }
    );
  }
}
