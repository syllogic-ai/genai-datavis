import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/forum(.*)'])
const isPublicRoute = createRouteMatcher(['/d/(.*)', '/api/public/(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Skip authentication for public dashboard routes
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Handle protected routes
  if (isProtectedRoute(req)) await auth.protect()

  // Add cache headers for API routes to improve performance
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    
    // Add cache-friendly headers for dashboard data
    if (req.nextUrl.pathname.includes('/dashboards') && req.method === 'GET') {
      // Cache dashboard list and metadata for 5 minutes with stale-while-revalidate
      response.headers.set(
        'Cache-Control', 
        'public, s-maxage=300, stale-while-revalidate=600'
      )
    }
    
    // Add cache headers for public dashboard data
    if (req.nextUrl.pathname.startsWith('/api/public/') && req.method === 'GET') {
      // Cache public dashboard data for 10 minutes with stale-while-revalidate
      response.headers.set(
        'Cache-Control', 
        'public, s-maxage=600, stale-while-revalidate=1200'
      )
    }
    
    return response
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}