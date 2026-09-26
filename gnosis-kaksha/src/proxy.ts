import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient, supabaseUrl } from '@/lib/supabase/admin';
import { AREA_ROLES, homeFor, type UserRole } from '@/lib/permissions';

/**
 * Server-side gate for the dashboard areas. Refreshes the Supabase session
 * cookie, then checks the caller's role (from the `profiles` table) against
 * AREA_ROLES. API routes do their own, finer-grained permission checks.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = supabaseUrl();
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return new NextResponse('Auth is not configured.', { status: 503 });
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const area = Object.keys(AREA_ROLES).find(
    (prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`)
  );

  const redirectTo = (path: string, withNext = false) => {
    const target = request.nextUrl.clone();
    target.pathname = path;
    target.search = '';
    if (withNext) target.searchParams.set('next', request.nextUrl.pathname);
    const redirect = NextResponse.redirect(target);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!data.user) return redirectTo('/auth', true);
  if (!area) return response;

  const { data: profile } = await createAdminClient()
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return redirectTo('/auth');

  const role = profile.role as UserRole;
  if (!AREA_ROLES[area].includes(role)) return redirectTo(homeFor(role));

  return response;
}

export const config = {
  matcher: ['/student/:path*', '/accountant/:path*', '/admin/:path*', '/teacher/:path*'],
};
