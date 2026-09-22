import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { generateUniqueId, createUserSession } from '@/lib/auth';
import { createLog } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Get stored state from the HttpOnly cookie.
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state')?.value;

    if (!code) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('error', '인증 코드가 없습니다.');
      return NextResponse.redirect(redirectUrl);
    }

    // Validate state to prevent CSRF
    if (!state || !storedState || state !== storedState) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('error', '잘못된 인증 요청입니다.');
      return NextResponse.redirect(redirectUrl);
    }

    let googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    let redirectUri = process.env.GOOGLE_REDIRECT_URI;

    try {
      const settings = await prisma.settings.findUnique({ where: { id: 'settings' } });
      googleClientId ||= settings?.googleClientId || undefined;
      redirectUri ||= settings?.googleRedirectUri || undefined;
    } catch {
      // Continue with environment variables
    }

    if (!googleClientId || !googleClientSecret || !redirectUri) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('error', 'Google OAuth 설정이 완료되지 않았습니다.');
      return NextResponse.redirect(redirectUrl);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.json().catch(() => ({}));
      console.error('Google token exchange failed:', tokenError);
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('error', 'Google 인증에 실패했습니다.');
      return NextResponse.redirect(redirectUrl);
    }

    const { access_token } = await tokenResponse.json();

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userInfoResponse.ok) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('error', '사용자 정보를 가져올 수 없습니다.');
      return NextResponse.redirect(redirectUrl);
    }

    const googleUser = await userInfoResponse.json();

    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
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

      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          googleId: googleUser.id,
          uniqueId,
          provider: 'google',
          isVerified: true,
        },
      });

      await createLog({
        type: 'SIGNUP',
        userId: user.id,
        email: user.email,
        action: 'Google 회원가입',
        details: { uniqueId, provider: 'google', googleId: googleUser.id },
        ipAddress: ip,
        userAgent,
      });
    } else if (user.isBlacklisted) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('error', '차단된 계정입니다.');
      return NextResponse.redirect(redirectUrl);
    } else {
      // Update googleId if not set
      if (!user.googleId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.id },
        });
      }
    }

    await createLog({
      type: 'LOGIN',
      userId: user.id,
      email: user.email,
      action: 'Google 로그인',
      ipAddress: ip,
      userAgent,
    });

    const sessionToken = await createUserSession(user.id);

    const redirectUrl = new URL('/', request.url);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    // Clear oauth state
    response.cookies.delete('oauth_state');

    return response;
  } catch (error) {
    console.error('Google callback error:', error);
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('error', 'Google 로그인 중 오류가 발생했습니다.');
    return NextResponse.redirect(redirectUrl);
  }
}
