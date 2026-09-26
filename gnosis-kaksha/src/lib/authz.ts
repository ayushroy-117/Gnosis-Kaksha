import 'server-only';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSessionClient } from '@/lib/supabase/server';
import { hasPermission, type Permission, type UserRole } from '@/lib/permissions';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  studentId: string | null;
  registrationNumber: string | null;
}

/**
 * The signed-in user, verified against the auth server (not just the cookie),
 * with the role read from the server-owned `profiles` table. Returns null when
 * signed out, when the profile is missing, or when the account is deactivated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  let authUserId: string;
  let authEmail: string;
  try {
    const supabase = await createSessionClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    authUserId = data.user.id;
    authEmail = data.user.email ?? '';
  } catch {
    return null;
  }

  const db = createAdminClient();
  const { data: profile } = await db
    .from('profiles')
    .select('id, role, full_name, email, student_id, is_active, students(registration_number)')
    .eq('id', authUserId)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  const student = profile.students as { registration_number?: string } | null;
  return {
    id: profile.id,
    email: profile.email || authEmail,
    role: profile.role as UserRole,
    fullName: profile.full_name || authEmail.split('@')[0],
    studentId: profile.student_id,
    registrationNumber: student?.registration_number ?? null,
  };
}

export type AuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

/** For route handlers: `const auth = await requirePermission('x'); if (!auth.ok) return auth.response;` */
export async function requirePermission(permission: Permission): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 }),
    };
  }
  if (!hasPermission(user.role, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'You do not have permission to do that.' },
        { status: 403 }
      ),
    };
  }
  return { ok: true, user };
}

/** For server actions, which return plain objects instead of responses. */
export async function authorizeAction(
  permission: Permission
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: 'Please sign in to continue.' };
  if (!hasPermission(user.role, permission)) {
    return { ok: false, error: 'You do not have permission to do that.' };
  }
  return { ok: true, user };
}

/** Consistent JSON error for unexpected failures, without leaking internals. */
export function serverError(context: string, err: unknown, message = 'Something went wrong. Please try again.') {
  console.error(`[${context}]`, err);
  return NextResponse.json({ error: message }, { status: 500 });
}
