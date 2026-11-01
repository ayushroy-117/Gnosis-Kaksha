import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveStudentId } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

interface Entry {
  studentId: string;
  status: 'present' | 'absent' | 'late';
  remark?: string;
}

// GET /api/student/attendance[?as=<studentId>] — the student's own attendance from the class
// registers teachers mark: per-subject totals and every class they missed.
export async function GET(request: NextRequest) {
  const auth = await requirePermission('view_own_portal');
  if (!auth.ok) return auth.response;
  const who = resolveStudentId(auth.user, request.nextUrl.searchParams.get('as'));
  if ('response' in who) return who.response;

  try {
    const db = createAdminClient();
    const { data: student, error: sErr } = await db.from('students').select('branch_id, class_number').eq('id', who.studentId).maybeSingle();
    if (sErr) throw sErr;
    if (!student) return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });

    const { data, error } = await db
      .from('attendance_records')
      .select('date, subject, teacher_name, entries')
      .eq('branch_id', student.branch_id)
      .eq('class_number', student.class_number)
      .order('date', { ascending: false })
      .limit(1000);
    if (error) throw error;

    const classes: Array<{ date: string; subject: string; teacher: string; status: Entry['status']; remark: string | null }> = [];
    for (const r of data ?? []) {
      const e = ((r.entries ?? []) as Entry[]).find((x) => x.studentId === who.studentId);
      if (e) classes.push({ date: r.date, subject: r.subject, teacher: r.teacher_name, status: e.status, remark: e.remark ?? null });
    }

    const bySubject = new Map<string, { subject: string; total: number; present: number; late: number; absent: number }>();
    for (const c of classes) {
      const s = bySubject.get(c.subject) ?? { subject: c.subject, total: 0, present: 0, late: 0, absent: 0 };
      s.total += 1;
      s[c.status] += 1;
      bySubject.set(c.subject, s);
    }
    // Late counts as attended.
    const pct = (attended: number, total: number) => (total ? Math.round((attended / total) * 1000) / 10 : null);
    const subjects = [...bySubject.values()].map((s) => ({ ...s, percent: pct(s.present + s.late, s.total) }));
    const attended = classes.filter((c) => c.status !== 'absent').length;

    return NextResponse.json({
      overall: { total: classes.length, attended, missed: classes.length - attended, percent: pct(attended, classes.length) },
      subjects: subjects.sort((a, b) => a.subject.localeCompare(b.subject)),
      classes,
      requiredPercent: 85,
    });
  } catch (err) {
    return serverError('student/attendance GET', err, 'Could not load attendance.');
  }
}
