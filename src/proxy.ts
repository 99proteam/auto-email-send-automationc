import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths that do not require authentication
  if (
    pathname === '/login' || 
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/campaign/run') ||
    pathname.startsWith('/api/inbox/check')
  ) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get('auth_token')?.value;

  // If no auth token, redirect to login
  if (!authToken || authToken !== 'authenticated') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
