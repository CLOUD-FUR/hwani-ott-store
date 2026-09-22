import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { createLog } from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: '인증 코드가 없습니다.' },
        { status: 400 }
      );
    }

    // Production credentials come from Vercel Environment Variables.
    // Database settings remain supported when configured later from the admin panel.
    let googleClientId = process.env.GOOGLE_CLIENT_ID;
    let googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    let redirectUri = process.env.GOOGLE_REDIRECT_URI || new URL('/api/auth/google/callback', request.url).toString();

    try {
      const settings = await prisma.settings?.findUnique({ where: { id: 'settings' } });
      googleClientId ||= settings?.googleClientId;
      googleClientSecret ||= settings?.googleClientSecret;
      redirectUri = settings?.googleRedirectUri || redirectUri;
    } catch {
      // Continue with environment variables when the database is unavailable.
    }

    if (!googleClientId || !googleClientSecret) {
      return NextResponse.json(
        { success: false, error: 'Google OAuth 환경 변수가 없습니다. Vercel Production에 GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET을 추가하세요.' },
        { status: 503 }
      );
    }

    // Google에서 토큰 가져오기
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
      return NextResponse.json(
        { success: false, error: 'Google 인증에 실패했습니다.' },
        { status: 400 }
      );
    }

    const { access_token } = await tokenResponse.json();

    // 사용자 정보 가져오기
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { success: false, error: '사용자 정보를 가져올 수 없습니다.' },
        { status: 400 }
      );
    }

    const googleUser = await userInfoResponse.json();

    // The current deployment may run before the database adapter is connected.
    // Complete OAuth with a signed session token in that case so login does not fail
    // after Google has already authenticated the account.
    if (typeof prisma.user?.findUnique !== 'function') {
      const token = generateToken({
        userId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        provider: 'google',
      });
      const redirectUrl = new URL('/auth/callback', process.env.NEXT_PUBLIC_API_URL || 'https://www.xn--9i1b408a2kja054b.com');
      redirectUrl.searchParams.set('token', token);
      return NextResponse.redirect(redirectUrl);
    }

    // 기존 사용자 확인
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      // 새 사용자 생성
      const { generateUniqueId } = await import('@/lib/auth');
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
          uniqueId,
          provider: 'google',
          isVerified: true, // Google 계정은 자동 인증
        },
      });

      // 로그 기록
      await createLog({
        type: 'signup',
        userId: user.id,
        email: user.email,
        action: 'Google 회원가입',
        details: { uniqueId, provider: 'google' },
      });
    } else if (user.isBlacklisted) {
      return NextResponse.json(
        { success: false, error: '차단된 계정입니다. 관리자에게 문의하세요.' },
        { status: 403 }
      );
    }

    // 로그 기록 (로그인)
    await createLog({
      type: 'access',
      userId: user.id,
      email: user.email,
      action: 'Google 로그인',
    });

    // JWT 토큰 생성
    const token = generateToken({
      userId: user.id,
      email: user.email,
      uniqueId: user.uniqueId,
      tier: user.tier,
    });

    // 클라이언트로 리다이렉트
    const redirectUrl = new URL('/auth/callback', process.env.NEXT_PUBLIC_API_URL || 'https://www.xn--9i1b408a2kja054b.com');
    redirectUrl.searchParams.set('token', token);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Google callback error:', error);
    return NextResponse.json(
      { success: false, error: 'Google 로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
