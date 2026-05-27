import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PATHS = ['/admin'];
const PARTNER_PATHS = ['/partner'];
const PROTECTED_PATHS = [...ADMIN_PATHS, ...PARTNER_PATHS, '/notifications'];

export function middleware(req: NextRequest) {
  const token = req.cookies.get('accessToken')?.value;
  const role = req.cookies.get('userRole')?.value;
  const { pathname } = req.nextUrl;

  // 이미 로그인된 상태에서 /login, /signup 접근 시 역할별 홈으로 리다이렉트
  const publicPaths = ['/login', '/signup'];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    if (token) {
      const home = role === 'admin' ? '/admin/dashboard' : '/partner/schedule';
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  }

  // 인증 필요 경로 진입 시 토큰 없으면 /login 으로 리다이렉트
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected && !token) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(pathname)}`, req.url),
    );
  }

  // 역할 불일치 시 본인 기본 경로로 리다이렉트
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/partner/schedule', req.url));
  }
  if (pathname.startsWith('/partner') && role !== 'partner') {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/partner/:path*', '/notifications/:path*', '/login', '/signup'],
};
