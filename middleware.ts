import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith('/dashboard') || pathname.startsWith('/forum');
}

function isPublicRoute(pathname: string): boolean {
  return pathname.startsWith('/d/') || pathname.startsWith('/api/public/');
}

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;
  
  // Skip authentication for public dashboard routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth pages
  if (sessionCookie && ["/sign-in", "/sign-up", "/login", "/signup"].includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  
  // Redirect unauthenticated users from protected routes
  if (!sessionCookie && isProtectedRoute(pathname)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Add cache headers for API routes to improve performance
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    
    // Add cache-friendly headers for dashboard data
    if (request.nextUrl.pathname.includes('/dashboards') && request.method === 'GET') {
      // Cache dashboard list and metadata for 5 minutes with stale-while-revalidate
      response.headers.set(
        'Cache-Control', 
        'public, s-maxage=300, stale-while-revalidate=600'
      )
    }
    
    // Add cache headers for public dashboard data
    if (request.nextUrl.pathname.startsWith('/api/public/') && request.method === 'GET') {
      // Cache public dashboard data for 10 minutes with stale-while-revalidate
      response.headers.set(
        'Cache-Control', 
        'public, s-maxage=600, stale-while-revalidate=1200'
      )
    }
    
    return response
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}