import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);

  // Skip auth check for login page and auth endpoints
  if (pathname.startsWith('/admin/login') || pathname.startsWith('/api/admin/auth/login') || pathname.startsWith('/api/admin/login')) {
    return NextResponse.next();
  }

  // Check admin session for all other admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin') || pathname.startsWith('/teams')) {
    const sessionToken = request.cookies.get('admin_session')?.value;

    if (!sessionToken) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json(
          { success: false, error: '관리자 로그인이 필요합니다.' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // The Edge middleware only checks that a session cookie exists.
    // Database-backed validation happens in each admin route handler.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/teams/:path*'],
};
