import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { teacherScopeFor } from '@/lib/server/institute';
import { canTeach } from '@/lib/institute-data';
import { logActivity, notify, readUpload, resolveStudentId, studentAccountIds, toBytea, UUID } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

const COLUMNS = 'id, doubt_id, teacher_id, teacher_name, branch_id, class_number, subject, title, note, link_url, file_name, file_mime, file_size, created_at, branches(name)';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapSolution = (r: any) => ({
  id: r.id,
  doubtId: r.doubt_id,
  teacherId: r.teacher_id,
  teacherName: r.teacher_name,
  branchId: r.branch_id,
  branchName: r.branches?.name ?? null,
  classNumber: r.class_number,
  subject: r.subject,
  title: r.title,
  note: r.note,
  linkUrl: r.link_url,
  fileUrl: r.file_name ? `/api/doubt-solutions/${r.id}/file` : null,
  fileName: r.file_name,
  fileType: r.file_mime ? (r.file_mime.startsWith('video/') ? 'video' : r.file_mime === 'application/pdf' ? 'pdf' : 'image') : null,
  fileSize: r.file_size,
  createdAt: r.created_at,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// GET /api/doubt-solutions — students: solutions posted to their class at their branch
// (subjects they take). Teachers: what they posted. Admin: all (or ?as=<student>).
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const as = request.nextUrl.searchParams.get('as');
  try {
    const db = createAdminClient();
    let q = db.from('doubt_solutions').select(COLUMNS).order('created_at', { ascending: false }).limit(200);
    if (user.role === 'student' || (user.role === 'admin' && as)) {
      const who = resolveStudentId(user, as);
      if ('response' in who) return who.response;
      const { data: s } = await db.from('students').select('branch_id, class_number, subjects').eq('id', who.studentId).maybeSingle();
      if (!s) return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
      q = q.eq('branch_id', s.branch_id).eq('class_number', s.class_number);
      const taking = new Set(((s.subjects ?? []) as string[]).map((x) => x.toLowerCase()));
      const { data, error } = await q;
      if (error) throw error;
      return NextResponse.json({ solutions: (data ?? []).filter((r) => taking.has(String(r.subject).toLowerCase())).map(mapSolution) });
    }
    if (user.role === 'teacher') q = q.eq('teacher_id', user.id);
    else if (user.role !== 'admin') return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ solutions: (data ?? []).map(mapSolution) });
  } catch (err) {
    return serverError('doubt-solutions GET', err, 'Could not load solutions.');
  }
}

const schema = z.object({
  classNumber: z.coerce.number().int().min(1).max(12),
  subject: z.string().trim().min(1).max(60),
  title: z.string().trim().min(3, 'Give the solution a title').max(150),
  note: z.string().trim().max(3000).optional().default(''),
  linkUrl: z.string().trim().max(500).optional().default(''),
  doubtId: z.string().regex(UUID).optional().or(z.literal('')),
  branchId: z.string().regex(UUID).optional().or(z.literal('')),
});

// POST /api/doubt-solutions (multipart) — a teacher posts a solution (photo, PDF, short video or
// a video link) to every student of a class at their branch. Answers the doubt it came from.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('answer_doubts');
  if (!auth.ok) return auth.response;
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Send the solution using the form.' }, { status: 400 });
  const parsed = schema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid solution' }, { status: 400 });
  const s = parsed.data;
  if (s.linkUrl && !/^https?:\/\//i.test(s.linkUrl)) return NextResponse.json({ error: 'Video links must start with http:// or https://' }, { status: 400 });
  const file = await readUpload(form.get('file'), ['image', 'pdf', 'video']);
  if (file && 'error' in file) return NextResponse.json({ error: `${file.error} For longer videos, paste a YouTube or Google Drive link instead.` }, { status: 400 });
  if (!file && !s.linkUrl && !s.note) return NextResponse.json({ error: 'Attach a file, add a video link, or write the solution.' }, { status: 400 });

  try {
    const db = createAdminClient();
    let branchId = auth.user.role === 'teacher' ? auth.user.branchId : s.branchId || null;
    let doubt: { id: string; student_id: string; branch_id: string } | null = null;
    if (s.doubtId) {
      const { data } = await db.from('doubts').select('id, student_id, branch_id, subject, class_number').eq('id', s.doubtId).maybeSingle();
      if (!data || data.class_number !== s.classNumber || data.subject.toLowerCase() !== s.subject.toLowerCase()) {
        return NextResponse.json({ error: 'That doubt does not match this class and subject.' }, { status: 400 });
      }
      doubt = data;
      branchId ??= data.branch_id;
    }
    if (!branchId) return NextResponse.json({ error: auth.user.role === 'teacher' ? 'Your account has no branch yet.' : 'Choose a branch.' }, { status: 400 });
    if (doubt && doubt.branch_id !== branchId) return NextResponse.json({ error: 'That doubt is from another branch.' }, { status: 400 });
    if (!canTeach(await teacherScopeFor(db, auth.user), s.subject, s.classNumber)) {
      return NextResponse.json({ error: `You are not assigned to teach ${s.subject} for Class ${s.classNumber}.` }, { status: 403 });
    }

    const { data, error } = await db
      .from('doubt_solutions')
      .insert({
        doubt_id: doubt?.id ?? null,
        teacher_id: auth.user.id,
        teacher_name: auth.user.fullName,
        branch_id: branchId,
        class_number: s.classNumber,
        subject: s.subject,
        title: s.title,
        note: s.note || null,
        link_url: s.linkUrl || null,
        file: file ? toBytea(file.bytes) : null,
        file_name: file?.name ?? null,
        file_mime: file?.mime ?? null,
        file_size: file?.size ?? null,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;

    if (doubt) await db.from('doubts').update({ status: 'answered', answered_at: new Date().toISOString() }).eq('id', doubt.id);
    await logActivity(db, auth.user, 'Doubt solution posted', `${s.title} · ${s.subject} · Class ${s.classNumber}`);
    await notify(db, await studentAccountIds(db, branchId, s.classNumber), {
      title: `New solution in ${s.subject}: ${s.title}`,
      body: `Posted by ${auth.user.fullName} for Class ${s.classNumber}.`,
      link: '/student/doubts',
    });
    return NextResponse.json({ success: true, solution: mapSolution(data) }, { status: 201 });
  } catch (err) {
    return serverError('doubt-solutions POST', err, 'Could not post the solution.');
  }
}

// DELETE /api/doubt-solutions?id=<uuid> — the teacher who posted it, or the admin.
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission('answer_doubts');
  if (!auth.ok) return auth.response;
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !UUID.test(id)) return NextResponse.json({ error: 'A valid id is required.' }, { status: 400 });
  try {
    const db = createAdminClient();
    let q = db.from('doubt_solutions').delete().eq('id', id);
    if (auth.user.role !== 'admin') q = q.eq('teacher_id', auth.user.id);
    const { data, error } = await q.select('id');
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('doubt-solutions DELETE', err, 'Could not delete the solution.');
  }
}
