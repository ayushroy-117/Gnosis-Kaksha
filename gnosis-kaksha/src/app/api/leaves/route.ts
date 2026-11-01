import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionUser, serverError } from '@/lib/authz';
import { hasPermission } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { adminIds, logActivity, notify, readUpload, todayIST, toBytea, UUID } from '@/lib/server/portal';
import { CASUAL_PER_YEAR, countLeaveDays, LEAVE_TYPES, type LeaveRequest } from '@/lib/leave';

export const dynamic = 'force-dynamic';

const COLUMNS = 'id, user_id, leave_type, from_date, to_date, half_day, days, reason, document_name, status, decided_by, decided_at, decision_note, created_at, profiles(full_name)';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapLeave = (r: any): LeaveRequest => ({
  id: r.id,
  userId: r.user_id,
  staffName: r.profiles?.full_name ?? undefined,
  leaveType: r.leave_type,
  fromDate: r.from_date,
  toDate: r.to_date,
  halfDay: r.half_day,
  days: Number(r.days),
  reason: r.reason,
  documentUrl: r.document_name ? `/api/leaves/${r.id}/document` : null,
  status: r.status,
  decidedBy: r.decided_by,
  decidedAt: r.decided_at,
  decisionNote: r.decision_note,
  createdAt: r.created_at,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Casual days used (approved) and held (pending) in a year. */
async function casualBalance(db: SupabaseClient, userId: string, year: string) {
  const { data, error } = await db
    .from('leave_requests')
    .select('days, status')
    .eq('user_id', userId)
    .eq('leave_type', 'casual')
    .in('status', ['approved', 'pending'])
    .gte('from_date', `${year}-01-01`)
    .lte('from_date', `${year}-12-31`);
  if (error) throw error;
  const sum = (s: string) => (data ?? []).filter((r) => r.status === s).reduce((a, r) => a + Number(r.days), 0);
  return { total: CASUAL_PER_YEAR, used: sum('approved'), pending: sum('pending'), remaining: Math.max(0, CASUAL_PER_YEAR - sum('approved')) };
}

// GET /api/leaves — own requests and casual balance. With ?all=1, the admin (and accountant, for
// reports) sees every staff member's requests.
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  if (user.role === 'student') return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
  const all = request.nextUrl.searchParams.get('all') === '1';
  if (all && !hasPermission(user.role, 'decide_leave') && !hasPermission(user.role, 'view_staff_reports')) {
    return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
  }
  try {
    const db = createAdminClient();
    let q = db.from('leave_requests').select(COLUMNS).order('created_at', { ascending: false }).limit(500);
    if (!all) q = q.eq('user_id', user.id);
    const [{ data, error }, balance] = await Promise.all([q, all ? Promise.resolve(null) : casualBalance(db, user.id, todayIST().slice(0, 4))]);
    if (error) throw error;
    return NextResponse.json({ leaves: (data ?? []).map(mapLeave), balance, canDecide: hasPermission(user.role, 'decide_leave') });
  } catch (err) {
    return serverError('leaves GET', err, 'Could not load leave.');
  }
}

const applySchema = z.object({
  leaveType: z.enum(['casual', 'sick', 'unpaid']),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the start date'),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the end date'),
  halfDay: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  reason: z.string().trim().min(3, 'Give a reason').max(500),
});

// POST /api/leaves (multipart) — apply for leave; the admin is notified.
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  if (user.role === 'student' || user.role === 'admin') return NextResponse.json({ error: 'Only teachers and accountants apply for leave here.' }, { status: 403 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Apply using the form.' }, { status: 400 });
  const parsed = applySchema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === 'string')));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  const l = parsed.data;
  const toDate = l.halfDay ? l.fromDate : l.toDate;
  if (toDate < l.fromDate) return NextResponse.json({ error: 'The end date is before the start date.' }, { status: 400 });
  const today = todayIST();
  if (l.leaveType !== 'sick' && l.fromDate <= today) {
    return NextResponse.json({ error: 'Apply at least 1 day in advance. For an emergency today, choose Sick Leave or contact the office.' }, { status: 400 });
  }
  if (l.fromDate.slice(0, 4) !== toDate.slice(0, 4)) return NextResponse.json({ error: 'Apply separately for each calendar year.' }, { status: 400 });
  const days = countLeaveDays(l.fromDate, toDate, l.halfDay);
  if (days <= 0) return NextResponse.json({ error: 'Those dates fall on a Sunday; no leave is needed.' }, { status: 400 });
  const doc = await readUpload(form.get('document'), ['image', 'pdf'], 5 * 1024 * 1024);
  if (doc && 'error' in doc) return NextResponse.json({ error: doc.error }, { status: 400 });

  try {
    const db = createAdminClient();
    const { data: overlap } = await db
      .from('leave_requests')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'approved'])
      .lte('from_date', toDate)
      .gte('to_date', l.fromDate)
      .limit(1);
    if (overlap?.length) return NextResponse.json({ error: 'You already have leave for some of these dates.' }, { status: 409 });
    if (l.leaveType === 'casual') {
      const b = await casualBalance(db, user.id, l.fromDate.slice(0, 4));
      if (b.used + b.pending + days > CASUAL_PER_YEAR) {
        return NextResponse.json({ error: `Only ${Math.max(0, CASUAL_PER_YEAR - b.used - b.pending)} casual day(s) left this year (including pending requests). Apply the rest as unpaid leave.` }, { status: 400 });
      }
    }
    const { data, error } = await db
      .from('leave_requests')
      .insert({
        user_id: user.id,
        leave_type: l.leaveType,
        from_date: l.fromDate,
        to_date: toDate,
        half_day: l.halfDay,
        days,
        reason: l.reason,
        document: doc ? toBytea(doc.bytes) : null,
        document_mime: doc?.mime ?? null,
        document_name: doc?.name ?? null,
      })
      .select(COLUMNS)
      .single();
    if (error) throw error;
    const label = `${LEAVE_TYPES[l.leaveType]}, ${days} day${days === 1 ? '' : 's'} from ${l.fromDate}`;
    await logActivity(db, user, 'Leave applied', label);
    await notify(db, await adminIds(db), { title: `Leave request from ${user.fullName}`, body: `${label}: ${l.reason.slice(0, 100)}`, link: '/admin/leaves' });
    return NextResponse.json({ success: true, leave: mapLeave(data) }, { status: 201 });
  } catch (err) {
    return serverError('leaves POST', err, 'Could not submit the leave request.');
  }
}

const decideSchema = z.object({
  id: z.string().regex(UUID),
  action: z.enum(['approve', 'reject', 'cancel']),
  note: z.string().trim().max(300).optional(),
});

// PATCH /api/leaves { id, action, note? } — admin approves/rejects; the applicant cancels a pending request.
export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const parsed = decideSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  const { id, action, note } = parsed.data;
  try {
    const db = createAdminClient();
    const { data: leave } = await db.from('leave_requests').select('user_id, status, leave_type, from_date, days, profiles(role)').eq('id', id).maybeSingle();
    if (!leave) return NextResponse.json({ error: 'Leave request not found.' }, { status: 404 });
    if (action === 'cancel') {
      if (leave.user_id !== user.id) return NextResponse.json({ error: 'You can only cancel your own leave.' }, { status: 403 });
      if (leave.status !== 'pending') return NextResponse.json({ error: 'Only a pending request can be cancelled.' }, { status: 400 });
    } else {
      if (!hasPermission(user.role, 'decide_leave')) return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
      if (leave.status !== 'pending') return NextResponse.json({ error: 'This request has already been decided.' }, { status: 400 });
    }
    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'cancelled';
    const { data, error } = await db
      .from('leave_requests')
      .update({ status, decided_by: action === 'cancel' ? null : user.fullName, decided_at: new Date().toISOString(), decision_note: note || null })
      .eq('id', id)
      .eq('status', 'pending')
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'This request has already been decided.' }, { status: 409 });
    if (action !== 'cancel') {
      await logActivity(db, user, `Leave ${status}`, `${(data.profiles as unknown as { full_name: string } | null)?.full_name ?? ''}: ${LEAVE_TYPES[leave.leave_type as keyof typeof LEAVE_TYPES]}, ${leave.days} day(s) from ${leave.from_date}`);
      await notify(db, [leave.user_id], {
        title: `Your leave from ${leave.from_date} was ${status}`,
        body: note ? `Note: ${note}` : undefined,
        link: `/${(leave.profiles as unknown as { role: string } | null)?.role === 'accountant' ? 'accountant' : 'teacher'}/leave`,
      });
    }
    return NextResponse.json({ success: true, leave: mapLeave(data) });
  } catch (err) {
    return serverError('leaves PATCH', err, 'Could not update the leave request.');
  }
}
