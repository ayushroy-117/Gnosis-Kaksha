import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the SERVICE-ROLE key.
 *
 * The service-role key bypasses Row Level Security, so this MUST never be
 * imported from a client component. `SUPABASE_SERVICE_ROLE_KEY` has no
 * `NEXT_PUBLIC_` prefix, so Next.js will not bundle it into the browser.
 *
 * Used for admin/accountant reads and admission approve/reject, because the
 * app's live session is localStorage-based (no auth cookie server-side), so
 * per-user RLS is not available yet. The dashboards are gated client-side by
 * DashboardLayout. See supabase/schema.sql for the access model and the
 * follow-up note about migrating to cookie-based auth for true server-side
 * authorization.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin client is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
