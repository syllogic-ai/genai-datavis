import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define which routes are public
const publicRoutes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/api/'
];

export function middleware(request: NextRequest) {
  // Check if the current route is public
  const isPublic = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Allow access to public routes without authentication
  if (isPublic) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const hasAuthCookie = request.cookies.has('__clerk_session');
  
  // If not authenticated, redirect to sign-in
  if (!hasAuthCookie && request.nextUrl.pathname.startsWith('/dashboard')) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', request.url);
    return NextResponse.redirect(signInUrl);
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