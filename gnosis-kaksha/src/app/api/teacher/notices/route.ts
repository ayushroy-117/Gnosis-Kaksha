import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapNotice, teacherScopeFor } from '@/lib/server/institute';
import { logActivity, notify, studentAccountIds, UUID } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapClassNotice = (r: any) => ({
  ...mapNotice(r),
  classNumber: r.class_number,
  branchId: r.branch_id,
  branchName: r.branches?.name ?? null,
  issuedBy: r.issued_by_name,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// GET /api/teacher/notices — notices this teacher sent to their classes (admin: all class notices).
export async function GET() {
  const auth = await requirePermission('issue_class_notice');
  if (!auth.ok) return auth.response;
  try {
    let q = createAdminClient().from('notices').select('*, branches(name)').eq('source', 'teacher').eq('is_active', true).order('published_at', { ascending: false }).limit(200);
    if (auth.user.role !== 'admin') q = q.eq('issued_by_id', auth.user.id);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ notices: (data ?? []).map(mapClassNotice) });
  } catch (err) {
    return serverError('teacher/notices GET', err, 'Could not load notices.');
  }
}

const schema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  content: z.string().trim().min(3, 'Write the notice').max(3000),
  classNumber: z.coerce.number().int().min(1).max(12),
  branchId: z.string().uuid().optional(),
});

// POST /api/teacher/notices — a notice to the students of one class (at the teacher's branch).
// It never appears on the public home page.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('issue_class_notice');
  if (!auth.ok) return auth.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid notice' }, { status: 400 });
  const n = parsed.data;
  const branchId = auth.user.role === 'teacher' ? auth.user.branchId : n.branchId;
  if (!branchId) return NextResponse.json({ error: auth.user.role === 'teacher' ? 'Your account has no branch yet.' : 'Choose a branch.' }, { status: 400 });
  try {
    const db = createAdminClient();
    const scope = await teacherScopeFor(db, auth.user);
    if (scope !== null && !scope.some((a) => a.classNumber === n.classNumber)) {
      return NextResponse.json({ error: `You do not teach Class ${n.classNumber}.` }, { status: 403 });
    }
    const { data, error } = await db
      .from('notices')
      .insert({
        title: n.title,
        content: n.content,
        audience: 'Students',
        is_pinned: false,
        is_active: true,
        source: 'teacher',
        class_number: n.classNumber,
        branch_id: branchId,
        issued_by_id: auth.user.id,
        issued_by_name: auth.user.fullName,
      })
      .select('*, branches(name)')
      .single();
    if (error) throw error;
    await logActivity(db, auth.user, 'Class notice issued', `${n.title} · Class ${n.classNumber}`);
    await notify(db, await studentAccountIds(db, branchId, n.classNumber), {
      title: `Notice from ${auth.user.fullName}: ${n.title}`,
      body: n.content.slice(0, 140),
      link: '/student/notices',
    });
    return NextResponse.json({ success: true, notice: mapClassNotice(data) }, { status: 201 });
  } catch (err) {
    return serverError('teacher/notices POST', err, 'Could not send the notice.');
  }
}

// DELETE /api/teacher/notices?id=<uuid> — the teacher who sent it, or the admin.
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission('issue_class_notice');
  if (!auth.ok) return auth.response;
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !UUID.test(id)) return NextResponse.json({ error: 'A valid id is required.' }, { status: 400 });
  try {
    let q = createAdminClient().from('notices').delete().eq('id', id).eq('source', 'teacher');
    if (auth.user.role !== 'admin') q = q.eq('issued_by_id', auth.user.id);
    const { data, error } = await q.select('id');
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: 'Notice not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('teacher/notices DELETE', err, 'Could not delete the notice.');
  }
}
