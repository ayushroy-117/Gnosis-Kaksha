import { NextResponse } from 'next/server';

// Auth note:
// The Supabase browser client (@supabase/supabase-js) persists the session in
// localStorage, NOT cookies, so middleware cannot read it here. The real auth guard
// lives in the dashboard shell (`useAuth` in DashboardLayout), which shows a spinner
// while loading and redirects unauthenticated users to `/auth`.
//
// The previous version checked for an `sb-auth-token` cookie that this client never
// sets, which blocked every legitimately logged-in user. We let requests through and
// rely on the client-side guard.
//
// TODO: migrate auth to @supabase/ssr (cookie-based sessions) to enable true
// server-side protection here, then gate on the `sb-<project-ref>-auth-token` cookie.
export function middleware() {
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/student/:path*', '/accountant/:path*', '/admin/:path*', '/teacher/:path*'],
};
