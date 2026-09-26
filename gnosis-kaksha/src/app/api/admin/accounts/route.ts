import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePermission, serverError } from '@/lib/authz';
import { ASSIGNABLE_ROLES, getPermissions, type UserRole } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET /api/admin/accounts — every account with its role and effective permissions.
export async function GET() {
  const auth = await requirePermission('manage_accounts');
  if (!auth.ok) return auth.response;

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('profiles')
      .select('id, role, full_name, email, is_active, created_at, student_id, students(registration_number)')
      .order('role')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const { data: authUsers } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const lastSignIn = new Map((authUsers?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));

    const accounts = (data ?? []).map((p) => ({
      id: p.id,
      role: p.role as UserRole,
      fullName: p.full_name,
      email: p.email,
      isActive: p.is_active,
      createdAt: p.created_at,
      lastSignInAt: lastSignIn.get(p.id) ?? null,
      registrationNumber: (p.students as { registration_number?: string } | null)?.registration_number ?? null,
      permissions: getPermissions(p.role as UserRole),
    }));
    return NextResponse.json({ accounts });
  } catch (err) {
    return serverError('admin/accounts GET', err, 'Could not load accounts.');
  }
}

const createSchema = z.object({
  fullName: z.string().trim().min(2, 'Name is required').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  role: z.enum(['teacher', 'accountant']),
  password: z.string().min(8, 'Temporary password must be at least 8 characters').max(128),
});

// POST /api/admin/accounts — create a teacher or accountant account.
// Students get accounts through the admission form; admin can never be created here.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('manage_accounts');
  if (!auth.ok) return auth.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const { fullName, email, role, password } = parsed.data;

  try {
    const db = createAdminClient();
    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !created.user) {
      const exists = /already/i.test(error?.message ?? '');
      return NextResponse.json(
        { error: exists ? 'An account with this email already exists.' : error?.message || 'Could not create account.' },
        { status: exists ? 409 : 400 }
      );
    }

    // The signup trigger created a 'student' profile; set the staff role.
    const { error: roleErr } = await db
      .from('profiles')
      .update({ role, full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', created.user.id);
    if (roleErr) {
      await db.auth.admin.deleteUser(created.user.id);
      throw roleErr;
    }

    return NextResponse.json({ success: true, id: created.user.id }, { status: 201 });
  } catch (err) {
    return serverError('admin/accounts POST', err, 'Could not create account.');
  }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(ASSIGNABLE_ROLES as [UserRole, ...UserRole[]]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'New password must be at least 8 characters').max(128).optional(),
});

// PATCH /api/admin/accounts — change role, (de)activate, or reset password.
export async function PATCH(request: NextRequest) {
  const auth = await requirePermission('manage_accounts');
  if (!auth.ok) return auth.response;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const { id, role, isActive, password } = parsed.data;
  if (role === undefined && isActive === undefined && password === undefined) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  try {
    const db = createAdminClient();
    const { data: target } = await db.from('profiles').select('id, role, student_id').eq('id', id).maybeSingle();
    if (!target) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });

    if (target.role === 'admin' && (role !== undefined || isActive === false)) {
      return NextResponse.json({ error: 'The master admin account cannot be demoted or deactivated.' }, { status: 400 });
    }
    if (role && role !== 'student' && target.student_id) {
      return NextResponse.json({ error: 'This account is linked to a student record and must stay a student.' }, { status: 400 });
    }

    if (password) {
      const { error } = await db.auth.admin.updateUserById(id, { password });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (role !== undefined) patch.role = role;
    if (isActive !== undefined) patch.is_active = isActive;
    const { error } = await db.from('profiles').update(patch).eq('id', id);
    if (error) throw error;

    // Deactivation also ends their current sessions.
    if (isActive === false) {
      await db.auth.admin.updateUserById(id, { ban_duration: '876000h' });
    } else if (isActive === true) {
      await db.auth.admin.updateUserById(id, { ban_duration: 'none' });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('admin/accounts PATCH', err, 'Could not update account.');
  }
}
