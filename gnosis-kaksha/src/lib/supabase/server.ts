import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseUrl } from '@/lib/supabase/admin';

/**
 * Cookie-bound Supabase client (anon key) for the signed-in user's session.
 * Used only for auth (sign in / out / getUser). Data access goes through
 * `createAdminClient` after an explicit permission check.
 */
export async function createSessionClient() {
  const url = supabaseUrl();
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Auth is not configured (SUPABASE_URL / SUPABASE_ANON_KEY).');
  }

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session cookie on the next request instead.
        }
      },
    },
  });
}
