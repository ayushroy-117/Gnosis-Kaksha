import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBranches } from '@/lib/server/institute';

export const dynamic = 'force-dynamic';

const DUPLICATE = 'A branch with this name already exists. Branch names must be unique.';

// GET /api/admin/branches — all branches incl. inactive, with student/teacher counts (admin).
export async function GET() {
  const auth = await requirePermission('manage_branches');
  if (!auth.ok) return auth.response;
  try {
    const db = createAdminClient();
    const [branches, students, teachers] = await Promise.all([
      getBranches(db),
      db.from('students').select('branch_id'),
      db.from('profiles').select('branch_id').eq('role', 'teacher'),
    ]);
    const count = (rows: Array<{ branch_id: string | null }> | null, id: string) => (rows ?? []).filter((r) => r.branch_id === id).length;
    return NextResponse.json({
      branches: branches.map((b) => ({
        ...b,
        studentCount: count(students.data, b.id),
        teacherCount: count(teachers.data, b.id),
      })),
    });
  } catch (err) {
    return serverError('admin/branches GET', err, 'Could not load branches.');
  }
}

const createSchema = z.object({
  name: z.string().trim().min(2, 'Branch name must be at least 2 characters').max(80),
  address: z.string().trim().max(300).optional(),
});

// POST /api/admin/branches — add a branch.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('manage_branches');
  if (!auth.ok) return auth.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid branch' }, { status: 400 });
  }
  try {
    const { data, error } = await createAdminClient()
      .from('branches')
      .insert({ name: parsed.data.name, address: parsed.data.address || null })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: DUPLICATE }, { status: 409 });
      throw error;
    }
    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (err) {
    return serverError('admin/branches POST', err, 'Could not add the branch.');
  }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, 'Branch name must be at least 2 characters').max(80).optional(),
  address: z.string().trim().max(300).nullable().optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/admin/branches — rename, change address, or (de)activate.
// A deactivated branch keeps its students/teachers but can't take new admissions.
export async function PATCH(request: NextRequest) {
  const auth = await requirePermission('manage_branches');
  if (!auth.ok) return auth.response;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid branch' }, { status: 400 });
  }
  const { id, name, address, isActive } = parsed.data;
  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (address !== undefined) patch.address = address || null;
  if (isActive !== undefined) patch.is_active = isActive;
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  try {
    const db = createAdminClient();
    if (isActive === false) {
      const { count } = await db.from('branches').select('id', { count: 'exact', head: true }).eq('is_active', true).neq('id', id);
      if ((count ?? 0) === 0) {
        return NextResponse.json({ error: 'At least one branch must stay active.' }, { status: 400 });
      }
    }
    const { data, error } = await db.from('branches').update(patch).eq('id', id).select('id');
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: DUPLICATE }, { status: 409 });
      throw error;
    }
    if (!data?.length) return NextResponse.json({ error: 'Branch not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('admin/branches PATCH', err, 'Could not update the branch.');
  }
}
