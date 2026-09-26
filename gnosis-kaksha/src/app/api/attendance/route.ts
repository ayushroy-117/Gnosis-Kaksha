import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { teacherScopeFor } from '@/lib/server/institute';
import { canTeach } from '@/lib/institute-data';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRecord(r: any) {
  return {
    id: r.id,
    date: r.date,
    classNumber: r.class_number,
    subject: r.subject,
    teacherName: r.teacher_name,
    mode: r.mode,
    entries: r.entries ?? [],
    totalStudents: r.total_students,
    presentCount: r.present_count,
    absentCount: r.absent_count,
    lateCount: r.late_count,
    savedAt: r.saved_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// GET /api/attendance?date=YYYY-MM-DD&classNumber=10&subject=Physics — one record,
// or the 100 most recent when no filters are given.
export async function GET(request: NextRequest) {
  const auth = await requirePermission('mark_attendance');
  if (!auth.ok) return auth.response;
  const sp = request.nextUrl.searchParams;
  try {
    const db = createAdminClient();
    const scope = await teacherScopeFor(db, auth.user);
    let q = db.from('attendance_records').select('*').order('date', { ascending: false }).limit(100);
    const date = sp.get('date');
    const classNumber = Number(sp.get('classNumber')) || null;
    const subject = sp.get('subject');
    if (date) q = q.eq('date', date);
    if (classNumber) q = q.eq('class_number', classNumber);
    if (subject) q = q.ilike('subject', subject);
    const { data, error } = await q;
    if (error) throw error;
    const records = (data ?? []).map(mapRecord).filter((r) => canTeach(scope, r.subject, r.classNumber));
    return NextResponse.json({ records });
  } catch (err) {
    return serverError('attendance GET', err, 'Could not load attendance.');
  }
}

const entrySchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string().max(200),
  registrationNumber: z.string().max(40),
  status: z.enum(['present', 'absent', 'late']),
  remark: z.string().max(300).optional(),
});

const saveSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  classNumber: z.coerce.number().int().min(1).max(12),
  subject: z.string().trim().min(1).max(60),
  mode: z.enum(['manual', 'biometric']).default('manual'),
  entries: z.array(entrySchema).min(1, 'No students to record attendance for.').max(500),
});

// POST /api/attendance — save (or overwrite) the record for a class/subject/day.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('mark_attendance');
  if (!auth.ok) return auth.response;
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid attendance' }, { status: 400 });
  }
  const r = parsed.data;
  if (r.date > new Date().toISOString().slice(0, 10)) {
    return NextResponse.json({ error: 'Attendance cannot be recorded for a future date.' }, { status: 400 });
  }
  const count = (s: string) => r.entries.filter((e) => e.status === s).length;

  try {
    const db = createAdminClient();
    if (!canTeach(await teacherScopeFor(db, auth.user), r.subject, r.classNumber)) {
      return NextResponse.json({ error: `You are not assigned to teach ${r.subject} for Class ${r.classNumber}. Ask the admin to update your subjects.` }, { status: 403 });
    }
    const row = {
      date: r.date,
      class_number: r.classNumber,
      subject: r.subject,
      teacher_id: auth.user.id,
      teacher_name: auth.user.fullName,
      mode: r.mode,
      entries: r.entries,
      total_students: r.entries.length,
      present_count: count('present'),
      absent_count: count('absent'),
      late_count: count('late'),
      saved_at: new Date().toISOString(),
    };
    const { data: existing } = await db
      .from('attendance_records')
      .select('id')
      .eq('date', r.date)
      .eq('class_number', r.classNumber)
      .ilike('subject', r.subject)
      .maybeSingle();
    const { data, error } = existing
      ? await db.from('attendance_records').update(row).eq('id', existing.id).select('*').single()
      : await db.from('attendance_records').insert(row).select('*').single();
    if (error) throw error;
    return NextResponse.json({ success: true, record: mapRecord(data) });
  } catch (err) {
    return serverError('attendance POST', err, 'Could not save attendance.');
  }
}
