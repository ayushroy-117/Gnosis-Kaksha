import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if user is trying to access protected routes
  const isProtectedRoute =
    pathname.startsWith('/student') ||
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/admin');

  // Note: Actual auth checking requires client-side implementation with cookies
  // This middleware acts as a supplementary check
  // The main auth protection happens in the page components via useAuth hook

  // Redirect to login if accessing protected routes
  if (isProtectedRoute) {
    try {
      // Get auth token from cookies (Supabase sets this automatically)
      const authToken = request.cookies.get('sb-auth-token');

      if (!authToken) {
        // Redirect to login page
        const loginUrl = new URL('/auth', request.url);
        return NextResponse.redirect(loginUrl);
      }
    } catch (error) {
      console.error('Middleware error:', error);
      // Allow request to proceed on error
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/student/:path*', '/teacher/:path*', '/admin/:path*'],
};
