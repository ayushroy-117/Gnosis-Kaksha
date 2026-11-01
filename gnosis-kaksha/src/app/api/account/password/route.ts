import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getSessionUser, serverError } from '@/lib/authz';
import { createAdminClient, supabaseUrl } from '@/lib/supabase/admin';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { logActivity } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

const schema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(200),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});

// POST /api/account/password — any signed-in user changes their own password.
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  if (!rateLimit(`pwchange:${user.id}:${clientIp(request.headers)}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }, { status: 429 });
  }
  const { currentPassword, newPassword } = parsed.data;
  if (currentPassword === newPassword) return NextResponse.json({ error: 'Choose a password different from the current one.' }, { status: 400 });

  try {
    // Check the current password with a throwaway client so the browser session is untouched.
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const check = createClient(supabaseUrl()!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: wrong } = await check.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (wrong) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    await check.auth.signOut();

    const db = createAdminClient();
    const { error } = await db.auth.admin.updateUserById(user.id, { password: newPassword });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (user.role !== 'student') await logActivity(db, user, 'Password changed');
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('account/password', err, 'Could not change the password.');
  }
}
