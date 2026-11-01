import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requirePermission, serverError, type SessionUser } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { teacherScopeFor } from '@/lib/server/institute';
import { canTeach } from '@/lib/institute-data';
import { logActivity, notify, studentAccountIds, UUID } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapTest(t: any) {
  const marks = (t.test_marks ?? []).map((m: any) => ({ studentId: m.student_id, marks: m.marks == null ? null : Number(m.marks), absent: m.absent }));
  const scored = marks.filter((m: any) => !m.absent && m.marks != null).map((m: any) => m.marks as number);
  return {
    id: t.id,
    branchId: t.branch_id,
    classNumber: t.class_number,
    subject: t.subject,
    testType: t.test_type,
    title: t.title,
    testDate: t.test_date,
    maxMarks: Number(t.max_marks),
    createdByName: t.created_by_name,
    marks,
    stats: {
      appeared: scored.length,
      average: scored.length ? Math.round((scored.reduce((a: number, b: number) => a + b, 0) / scored.length) * 10) / 10 : null,
      highest: scored.length ? Math.max(...scored) : null,
    },
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const SELECT = '*, test_marks(student_id, marks, absent)';

/** Branch a results action is for: teachers their own; admin must say which. */
function branchFor(user: SessionUser, requested?: string | null) {
  return user.role === 'teacher' ? user.branchId : requested ?? null;
}

// GET /api/results?classNumber=&subject=&branchId= — tests (with marks) the caller may manage.
export async function GET(request: NextRequest) {
  const auth = await requirePermission('manage_results');
  if (!auth.ok) return auth.response;
  const sp = request.nextUrl.searchParams;
  try {
    const db = createAdminClient();
    const scope = await teacherScopeFor(db, auth.user);
    let q = db.from('tests').select(SELECT).order('test_date', { ascending: false }).limit(200);
    const branchId = branchFor(auth.user, sp.get('branchId'));
    if (auth.user.role === 'teacher' && !branchId) return NextResponse.json({ error: 'Your account has no branch yet. Ask the admin to set it.' }, { status: 403 });
    if (branchId) q = q.eq('branch_id', branchId);
    const classNumber = Number(sp.get('classNumber')) || null;
    if (classNumber) q = q.eq('class_number', classNumber);
    const subject = sp.get('subject');
    if (subject) q = q.ilike('subject', subject);
    const { data, error } = await q;
    if (error) throw error;
    const tests = (data ?? []).filter((t) => canTeach(scope, t.subject, t.class_number)).map(mapTest);
    return NextResponse.json({ tests });
  } catch (err) {
    return serverError('results GET', err, 'Could not load results.');
  }
}

const markSchema = z.object({
  studentId: z.string().uuid(),
  marks: z.number().min(0).nullable(),
  absent: z.boolean().default(false),
});
const testSchema = z.object({
  classNumber: z.coerce.number().int().min(1).max(12),
  subject: z.string().trim().min(1).max(60),
  testType: z.enum(['weekly', 'monthly', 'other']),
  title: z.string().trim().min(2, 'Give the test a name').max(120),
  testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the test date'),
  maxMarks: z.coerce.number().positive('Full marks must be more than 0').max(1000),
  branchId: z.string().uuid().optional(),
  marks: z.array(markSchema).min(1, 'No students to enter marks for.').max(500),
});

/** Every student must be an active student of that class at that branch; marks within full marks. */
async function checkMarks(db: SupabaseClient, branchId: string, classNumber: number, maxMarks: number, marks: z.infer<typeof markSchema>[]) {
  if (marks.some((m) => !m.absent && m.marks != null && m.marks > maxMarks)) return `Marks cannot be more than the full marks (${maxMarks}).`;
  const ids = [...new Set(marks.map((m) => m.studentId))];
  const { data, error } = await db.from('students').select('id').eq('branch_id', branchId).eq('class_number', classNumber).in('id', ids);
  if (error) throw error;
  return (data ?? []).length === ids.length ? null : 'Some students are not in this class at this branch.';
}

const markRows = (testId: string, marks: z.infer<typeof markSchema>[]) =>
  marks.map((m) => ({ test_id: testId, student_id: m.studentId, marks: m.absent ? null : m.marks, absent: m.absent }));

// POST /api/results — create a test with its marks; students are notified.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('manage_results');
  if (!auth.ok) return auth.response;
  const parsed = testSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid test' }, { status: 400 });
  const t = parsed.data;
  const branchId = branchFor(auth.user, t.branchId);
  if (!branchId) return NextResponse.json({ error: auth.user.role === 'teacher' ? 'Your account has no branch yet.' : 'Choose a branch.' }, { status: 400 });
  try {
    const db = createAdminClient();
    if (!canTeach(await teacherScopeFor(db, auth.user), t.subject, t.classNumber)) {
      return NextResponse.json({ error: `You are not assigned to teach ${t.subject} for Class ${t.classNumber}.` }, { status: 403 });
    }
    const bad = await checkMarks(db, branchId, t.classNumber, t.maxMarks, t.marks);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });

    const { data: test, error } = await db
      .from('tests')
      .insert({
        branch_id: branchId,
        class_number: t.classNumber,
        subject: t.subject,
        test_type: t.testType,
        title: t.title,
        test_date: t.testDate,
        max_marks: t.maxMarks,
        created_by: auth.user.id,
        created_by_name: auth.user.fullName,
      })
      .select('id')
      .single();
    if (error) throw error;
    const { error: mErr } = await db.from('test_marks').insert(markRows(test.id, t.marks));
    if (mErr) {
      await db.from('tests').delete().eq('id', test.id);
      throw mErr;
    }

    await logActivity(db, auth.user, 'Test result uploaded', `${t.title} · ${t.subject} · Class ${t.classNumber}`);
    await notify(db, await studentAccountIds(db, branchId, t.classNumber), {
      title: `Result published: ${t.title}`,
      body: `${t.subject} ${t.testType} test. See your marks and rank.`,
      link: '/student/results',
    });
    const { data: full } = await db.from('tests').select(SELECT).eq('id', test.id).single();
    return NextResponse.json({ success: true, test: mapTest(full) }, { status: 201 });
  } catch (err) {
    return serverError('results POST', err, 'Could not save the test.');
  }
}

// PUT /api/results { id, marks, title?, testDate?, maxMarks? } — correct a test's marks or details.
export async function PUT(request: NextRequest) {
  const auth = await requirePermission('manage_results');
  if (!auth.ok) return auth.response;
  const parsed = testSchema
    .pick({ title: true, testDate: true, maxMarks: true, marks: true })
    .partial({ title: true, testDate: true, maxMarks: true })
    .extend({ id: z.string().uuid() })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid test' }, { status: 400 });
  const u = parsed.data;
  try {
    const db = createAdminClient();
    const { data: test } = await db.from('tests').select('*').eq('id', u.id).maybeSingle();
    if (!test) return NextResponse.json({ error: 'Test not found.' }, { status: 404 });
    if ((auth.user.role === 'teacher' && test.branch_id !== auth.user.branchId) || !canTeach(await teacherScopeFor(db, auth.user), test.subject, test.class_number)) {
      return NextResponse.json({ error: 'You can only edit tests for subjects you teach.' }, { status: 403 });
    }
    const max = u.maxMarks ?? Number(test.max_marks);
    const bad = await checkMarks(db, test.branch_id, test.class_number, max, u.marks);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (u.title) patch.title = u.title;
    if (u.testDate) patch.test_date = u.testDate;
    if (u.maxMarks) patch.max_marks = u.maxMarks;
    if (Object.keys(patch).length) {
      const { error } = await db.from('tests').update(patch).eq('id', u.id);
      if (error) throw error;
    }
    const { error } = await db.from('test_marks').upsert(markRows(u.id, u.marks), { onConflict: 'test_id,student_id' });
    if (error) throw error;
    await logActivity(db, auth.user, 'Test marks updated', `${u.title ?? test.title} · ${test.subject} · Class ${test.class_number}`);
    const { data: full } = await db.from('tests').select(SELECT).eq('id', u.id).single();
    return NextResponse.json({ success: true, test: mapTest(full) });
  } catch (err) {
    return serverError('results PUT', err, 'Could not update the test.');
  }
}

// DELETE /api/results?id=<uuid>
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission('manage_results');
  if (!auth.ok) return auth.response;
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !UUID.test(id)) return NextResponse.json({ error: 'A valid id is required.' }, { status: 400 });
  try {
    const db = createAdminClient();
    const { data: test } = await db.from('tests').select('branch_id, subject, class_number, title').eq('id', id).maybeSingle();
    if (!test) return NextResponse.json({ error: 'Test not found.' }, { status: 404 });
    if ((auth.user.role === 'teacher' && test.branch_id !== auth.user.branchId) || !canTeach(await teacherScopeFor(db, auth.user), test.subject, test.class_number)) {
      return NextResponse.json({ error: 'You can only delete tests for subjects you teach.' }, { status: 403 });
    }
    const { error } = await db.from('tests').delete().eq('id', id);
    if (error) throw error;
    await logActivity(db, auth.user, 'Test deleted', `${test.title} · ${test.subject} · Class ${test.class_number}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('results DELETE', err, 'Could not delete the test.');
  }
}
