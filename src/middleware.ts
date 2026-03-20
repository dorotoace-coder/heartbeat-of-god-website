import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Protect the /admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check for a simple bespoke auth cookie
    const authCookie = request.cookies.get('hbg_admin_session');
    
    // If not authenticated, redirect to /login
    if (!authCookie || authCookie.value !== 'authenticated-super-admin') {
      const loginUrl = new URL('/login', request.url);
      // Optional: Add the intended destination to redirect back after login
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Ensure the middleware only runs on necessary routes to save processing time
export const config = {
  matcher: ['/admin/:path*'],
};
