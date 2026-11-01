import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveStudentId } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

const round1 = (n: number) => Math.round(n * 10) / 10;

// GET /api/student/results[?as=<studentId>] — the student's marks in every test of their
// class, with percentage, rank in the class, class average and subject-wise performance.
export async function GET(request: NextRequest) {
  const auth = await requirePermission('view_own_portal');
  if (!auth.ok) return auth.response;
  const who = resolveStudentId(auth.user, request.nextUrl.searchParams.get('as'));
  if ('response' in who) return who.response;

  try {
    const db = createAdminClient();
    const { data: student } = await db.from('students').select('branch_id, class_number, subjects').eq('id', who.studentId).maybeSingle();
    if (!student) return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    const taking = new Set(((student.subjects ?? []) as string[]).map((s) => s.toLowerCase()));

    const { data, error } = await db
      .from('tests')
      .select('id, subject, test_type, title, test_date, max_marks, created_by_name, test_marks(student_id, marks, absent)')
      .eq('branch_id', student.branch_id)
      .eq('class_number', student.class_number)
      .order('test_date', { ascending: false });
    if (error) throw error;

    const tests = (data ?? [])
      .filter((t) => taking.has(String(t.subject).toLowerCase()))
      .map((t) => {
        const max = Number(t.max_marks);
        const marks = (t.test_marks ?? []) as Array<{ student_id: string; marks: number | null; absent: boolean }>;
        const mine = marks.find((m) => m.student_id === who.studentId);
        const scored = marks.filter((m) => !m.absent && m.marks != null).map((m) => Number(m.marks));
        const my = mine && !mine.absent && mine.marks != null ? Number(mine.marks) : null;
        return {
          id: t.id,
          subject: t.subject,
          testType: t.test_type,
          title: t.title,
          testDate: t.test_date,
          teacher: t.created_by_name,
          maxMarks: max,
          marks: my,
          absent: mine?.absent ?? false,
          recorded: !!mine,
          percent: my == null ? null : round1((my / max) * 100),
          // Rank among those who appeared: 1 + how many scored more.
          rank: my == null ? null : 1 + scored.filter((s) => s > my).length,
          appeared: scored.length,
          classAverage: scored.length ? round1(scored.reduce((a, b) => a + b, 0) / scored.length) : null,
          highest: scored.length ? Math.max(...scored) : null,
        };
      })
      .filter((t) => t.recorded);

    const bySubject = new Map<string, number[]>();
    for (const t of tests) if (t.percent != null) bySubject.set(t.subject, [...(bySubject.get(t.subject) ?? []), t.percent]);
    const subjects = [...bySubject].map(([subject, ps]) => ({
      subject,
      tests: ps.length,
      average: round1(ps.reduce((a, b) => a + b, 0) / ps.length),
      best: Math.max(...ps),
    })).sort((a, b) => b.average - a.average);
    const all = tests.filter((t) => t.percent != null).map((t) => t.percent as number);

    return NextResponse.json({
      tests,
      subjects,
      summary: {
        testsTaken: all.length,
        absences: tests.filter((t) => t.absent).length,
        average: all.length ? round1(all.reduce((a, b) => a + b, 0) / all.length) : null,
        bestSubject: subjects[0]?.subject ?? null,
        weakestSubject: subjects.length > 1 ? subjects[subjects.length - 1].subject : null,
      },
    });
  } catch (err) {
    return serverError('student/results GET', err, 'Could not load results.');
  }
}
