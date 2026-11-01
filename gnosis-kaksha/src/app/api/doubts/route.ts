import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, serverError } from '@/lib/authz';
import { hasPermission } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { teacherScopeFor } from '@/lib/server/institute';
import { canTeach } from '@/lib/institute-data';
import { notify, readUpload, resolveStudentId, teachersFor, toBytea, UUID } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

const COLUMNS = 'id, student_id, branch_id, class_number, subject, teacher_id, question, image_mime, status, created_at, answered_at, students(full_name, registration_number), teacher:profiles(full_name)';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapDoubt = (r: any) => ({
  id: r.id,
  studentId: r.student_id,
  studentName: r.students?.full_name ?? 'Student',
  registrationNumber: r.students?.registration_number ?? '',
  branchId: r.branch_id,
  classNumber: r.class_number,
  subject: r.subject,
  teacherId: r.teacher_id,
  teacherName: r.teacher?.full_name ?? null,
  question: r.question,
  imageUrl: r.image_mime ? `/api/doubts/${r.id}/image` : null,
  status: r.status,
  createdAt: r.created_at,
  answeredAt: r.answered_at,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// GET /api/doubts — students: their own doubts and the teachers they can ask.
// Teachers: doubts from their branch for subjects/classes they teach. Admin: all (or ?as=<student>).
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const as = request.nextUrl.searchParams.get('as');
  try {
    const db = createAdminClient();
    if (user.role === 'student' || (user.role === 'admin' && as)) {
      const who = resolveStudentId(user, as);
      if ('response' in who) return who.response;
      const { data: s } = await db.from('students').select('branch_id, class_number, subjects').eq('id', who.studentId).maybeSingle();
      if (!s) return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
      const [{ data, error }, teachers] = await Promise.all([
        db.from('doubts').select(COLUMNS).eq('student_id', who.studentId).order('created_at', { ascending: false }),
        Promise.all(((s.subjects ?? []) as string[]).map(async (subject) => ({ subject, teachers: await teachersFor(db, s.branch_id, s.class_number, subject) }))),
      ]);
      if (error) throw error;
      return NextResponse.json({ doubts: (data ?? []).map(mapDoubt), subjects: teachers });
    }
    if (!hasPermission(user.role, 'answer_doubts')) return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
    let q = db.from('doubts').select(COLUMNS).order('created_at', { ascending: false }).limit(300);
    if (user.role === 'teacher') q = q.eq('branch_id', user.branchId ?? '00000000-0000-0000-0000-000000000000');
    const { data, error } = await q;
    if (error) throw error;
    const scope = await teacherScopeFor(db, user);
    const doubts = (data ?? []).filter((d) => canTeach(scope, d.subject, d.class_number)).map(mapDoubt);
    return NextResponse.json({ doubts });
  } catch (err) {
    return serverError('doubts GET', err, 'Could not load doubts.');
  }
}

const askSchema = z.object({
  subject: z.string().trim().min(1).max(60),
  teacherId: z.string().uuid('Choose the teacher to ask'),
  question: z.string().trim().min(5, 'Describe your doubt in a few words').max(2000),
});

// POST /api/doubts (multipart: subject, teacherId, question, image?) — a student asks a doubt.
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  if (user.role !== 'student' || !user.studentId) return NextResponse.json({ error: 'Only students can ask doubts.' }, { status: 403 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Send the doubt using the form.' }, { status: 400 });
  const parsed = askSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid doubt' }, { status: 400 });
  const image = await readUpload(form.get('image'), ['image'], 5 * 1024 * 1024);
  if (image && 'error' in image) return NextResponse.json({ error: image.error }, { status: 400 });

  try {
    const db = createAdminClient();
    const { data: s } = await db.from('students').select('branch_id, class_number, subjects, status, full_name').eq('id', user.studentId).maybeSingle();
    if (!s || s.status !== 'active') return NextResponse.json({ error: 'Doubt support opens once your admission is approved.' }, { status: 403 });
    const { subject, teacherId, question } = parsed.data;
    if (!((s.subjects ?? []) as string[]).some((x) => x.toLowerCase() === subject.toLowerCase())) {
      return NextResponse.json({ error: 'You can only ask about subjects you are enrolled in.' }, { status: 400 });
    }
    const teachers = await teachersFor(db, s.branch_id, s.class_number, subject);
    if (!teachers.some((t) => t.id === teacherId)) return NextResponse.json({ error: 'That teacher does not teach this subject for your class.' }, { status: 400 });

    const { data, error } = await db
      .from('doubts')
      .insert({
        student_id: user.studentId,
        branch_id: s.branch_id,
        class_number: s.class_number,
        subject,
        teacher_id: teacherId,
        question,
        image: image ? toBytea(image.bytes) : null,
        image_mime: image ? image.mime : null,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    await notify(db, [teacherId], {
      title: `New doubt in ${subject} (Class ${s.class_number})`,
      body: `${s.full_name}: ${question.slice(0, 120)}`,
      link: '/teacher/doubts',
    });
    return NextResponse.json({ success: true, doubt: mapDoubt(data) }, { status: 201 });
  } catch (err) {
    return serverError('doubts POST', err, 'Could not send your doubt.');
  }
}

// PATCH /api/doubts { id, status } — the teacher marks a doubt answered (or reopens it).
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !hasPermission(user.role, 'answer_doubts')) return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
  const parsed = z.object({ id: z.string().regex(UUID), status: z.enum(['open', 'answered']) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  try {
    const db = createAdminClient();
    const { data: d } = await db.from('doubts').select('branch_id, subject, class_number').eq('id', parsed.data.id).maybeSingle();
    if (!d || (user.role === 'teacher' && d.branch_id !== user.branchId) || !canTeach(await teacherScopeFor(db, user), d.subject, d.class_number)) {
      return NextResponse.json({ error: 'Doubt not found.' }, { status: 404 });
    }
    const { error } = await db
      .from('doubts')
      .update({ status: parsed.data.status, answered_at: parsed.data.status === 'answered' ? new Date().toISOString() : null })
      .eq('id', parsed.data.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('doubts PATCH', err, 'Could not update the doubt.');
  }
}
