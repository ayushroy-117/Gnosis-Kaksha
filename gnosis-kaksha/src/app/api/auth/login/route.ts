import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSessionClient } from '@/lib/supabase/server';
import { getSessionUser, serverError } from '@/lib/authz';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { homeFor } from '@/lib/permissions';

const bodySchema = z.object({
  identifier: z.string().trim().min(3).max(200),
  password: z.string().min(1).max(200),
});

const INVALID = 'Invalid email / registration number or password.';

// POST /api/auth/login — email or registration number (GK-YYYY-NNNN) + password.
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter your email or registration number and password.' }, { status: 400 });
  }
  const { identifier, password } = parsed.data;

  const ip = clientIp(request.headers);
  if (!rateLimit(`login:ip:${ip}`, 30, 15 * 60_000) || !rateLimit(`login:id:${identifier.toLowerCase()}`, 8, 15 * 60_000)) {
    return NextResponse.json({ error: 'Too many sign-in attempts. Please wait 15 minutes and try again.' }, { status: 429 });
  }

  try {
    let email = identifier.toLowerCase();
    if (/^gk-/i.test(identifier)) {
      // Registration number -> the student's account email
      const db = createAdminClient();
      const { data: student } = await db
        .from('students')
        .select('id')
        .eq('registration_number', identifier.toUpperCase())
        .maybeSingle();
      const { data: profile } = student
        ? await db.from('profiles').select('email').eq('student_id', student.id).maybeSingle()
        : { data: null };
      if (!profile?.email) return NextResponse.json({ error: INVALID }, { status: 401 });
      email = profile.email;
    }

    const supabase = await createSessionClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return NextResponse.json({ error: INVALID }, { status: 401 });

    const user = await getSessionUser();
    if (!user) {
      await supabase.auth.signOut();
      return NextResponse.json({ error: 'This account is disabled. Contact the institute office.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, user, redirectTo: homeFor(user.role) });
  } catch (err) {
    return serverError('auth/login', err, 'Sign-in is unavailable right now. Please try again shortly.');
  }
}
