import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { todayIST, UUID } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/reports/staff?from=YYYY-MM-DD&to=YYYY-MM-DD[&userId=] — everything each teacher and
// accountant did in the period, for the one-click report on the accountant and admin portals.
export async function GET(request: NextRequest) {
  const auth = await requirePermission('view_staff_reports');
  if (!auth.ok) return auth.response;
  const sp = request.nextUrl.searchParams;
  const today = todayIST();
  const from = DATE.test(sp.get('from') ?? '') ? sp.get('from')! : `${today.slice(0, 7)}-01`;
  const to = DATE.test(sp.get('to') ?? '') ? sp.get('to')! : today;
  const userId = sp.get('userId');
  if (userId && !UUID.test(userId)) return NextResponse.json({ error: 'Invalid staff id.' }, { status: 400 });
  const fromTs = `${from}T00:00:00+05:30`;
  const toTs = `${to}T23:59:59.999+05:30`;

  try {
    const db = createAdminClient();
    const q = <T,>(p: PromiseLike<{ data: T[] | null; error: unknown }>) => p.then(({ data, error }) => { if (error) throw error; return data ?? []; });
    const [staff, presence, leaves, registers, materials, tests, solutions, notices, openDoubts, salaries, activity] = await Promise.all([
      q(db.from('profiles').select('id, full_name, role, is_active, branches(name), staff_details(staff_code, department, employment_status)').in('role', ['teacher', 'accountant']).order('full_name')),
      q(db.from('staff_attendance').select('user_id, date, check_out_at').gte('date', from).lte('date', to)),
      q(db.from('leave_requests').select('user_id, days, status').lte('from_date', to).gte('to_date', from).in('status', ['approved', 'pending'])),
      q(db.from('attendance_records').select('teacher_id').gte('date', from).lte('date', to)),
      q(db.from('study_materials').select('uploader_id').gte('created_at', fromTs).lte('created_at', toTs)),
      q(db.from('tests').select('created_by').gte('created_at', fromTs).lte('created_at', toTs)),
      q(db.from('doubt_solutions').select('teacher_id').gte('created_at', fromTs).lte('created_at', toTs)),
      q(db.from('notices').select('issued_by_id').eq('source', 'teacher').gte('published_at', fromTs).lte('published_at', toTs)),
      q(db.from('doubts').select('teacher_id').eq('status', 'open')),
      q(db.from('salary_payments').select('user_id, net, status').gte('period', `${from.slice(0, 7)}-01`).lte('period', `${to.slice(0, 7)}-01`)),
      (() => {
        let a = db.from('activity_log').select('user_id, user_name, role, action, detail, created_at').gte('created_at', fromTs).lte('created_at', toTs).order('created_at', { ascending: false }).limit(500);
        if (userId) a = a.eq('user_id', userId);
        return q(a);
      })(),
    ]);

    const count = <R,>(rows: R[], key: (r: R) => unknown, id: string) => rows.filter((r) => key(r) === id).length;
    const rows = (staff as Array<Record<string, unknown>>).map((p) => {
      const id = p.id as string;
      const sd = (Array.isArray(p.staff_details) ? p.staff_details[0] : p.staff_details) as { staff_code?: string; department?: string; employment_status?: string } | null;
      const myLeaves = (leaves as Array<{ user_id: string; days: number; status: string }>).filter((l) => l.user_id === id);
      const mySalary = (salaries as Array<{ user_id: string; net: number; status: string }>).filter((s) => s.user_id === id && s.status === 'paid');
      return {
        userId: id,
        name: (p.full_name as string) || 'Staff',
        role: p.role as string,
        staffCode: sd?.staff_code ?? '',
        department: sd?.department ?? null,
        branch: (p.branches as { name: string } | null)?.name ?? null,
        status: sd?.employment_status ?? (p.is_active ? 'active' : 'inactive'),
        daysPresent: count(presence as Array<{ user_id: string }>, (r) => r.user_id, id),
        missedCheckouts: (presence as Array<{ user_id: string; date: string; check_out_at: string | null }>).filter((r) => r.user_id === id && !r.check_out_at && r.date !== today).length,
        leaveDays: myLeaves.filter((l) => l.status === 'approved').reduce((s, l) => s + Number(l.days), 0),
        pendingLeaves: myLeaves.filter((l) => l.status === 'pending').length,
        registersMarked: count(registers as Array<{ teacher_id: string }>, (r) => r.teacher_id, id),
        materialsUploaded: count(materials as Array<{ uploader_id: string }>, (r) => r.uploader_id, id),
        testsUploaded: count(tests as Array<{ created_by: string }>, (r) => r.created_by, id),
        solutionsPosted: count(solutions as Array<{ teacher_id: string }>, (r) => r.teacher_id, id),
        noticesIssued: count(notices as Array<{ issued_by_id: string }>, (r) => r.issued_by_id, id),
        openDoubts: count(openDoubts as Array<{ teacher_id: string }>, (r) => r.teacher_id, id),
        salaryPaid: mySalary.reduce((s, x) => s + Number(x.net), 0),
        lastActivity: (activity as Array<{ user_id: string; created_at: string }>).find((a) => a.user_id === id)?.created_at ?? null,
      };
    });

    return NextResponse.json({
      from,
      to,
      staff: userId ? rows.filter((r) => r.userId === userId) : rows,
      activity: (activity as Array<Record<string, unknown>>).map((a) => ({
        userId: a.user_id, name: a.user_name, role: a.role, action: a.action, detail: a.detail, at: a.created_at,
      })),
    });
  } catch (err) {
    return serverError('reports/staff GET', err, 'Could not build the staff report.');
  }
}
