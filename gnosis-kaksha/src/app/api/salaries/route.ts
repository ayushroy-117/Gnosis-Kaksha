import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSessionUser, requirePermission, serverError } from '@/lib/authz';
import { hasPermission } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { bankSchema, loadAllStaff, saveStaffDetails, type StaffProfile } from '@/lib/server/staff';
import { logActivity, notify, UUID } from '@/lib/server/portal';
import { maskAccount, periodLabel, PAYMENT_MODES, type SalaryPayment } from '@/lib/salary';
import type { UserRole } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapPayment(r: any, staff: StaffProfile | undefined, subjects: string | null): SalaryPayment {
  return {
    id: r.id,
    userId: r.user_id,
    staffName: staff?.fullName ?? 'Staff',
    staffCode: staff?.staffCode ?? '',
    designation: staff?.designation ?? '',
    department: staff?.department ?? null,
    subjects,
    dateOfJoining: staff?.dateOfJoining ?? null,
    photoUrl: staff?.photoUrl ?? null,
    period: String(r.period).slice(0, 7),
    earnings: r.earnings ?? [],
    deductions: r.deductions ?? [],
    gross: Number(r.gross),
    totalDeduction: Number(r.total_deduction),
    net: Number(r.net),
    status: r.status,
    paymentDate: r.payment_date,
    paymentMode: r.payment_mode,
    reference: r.reference,
    receiptNumber: r.receipt_number,
    note: r.note,
    preparedBy: r.prepared_by,
    bankName: staff?.bankName ?? null,
    bankAccountMasked: maskAccount(staff?.bankAccount ?? null),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function subjectsBy(db: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await db.from('teacher_assignments').select('teacher_id, subject');
  if (error) throw error;
  const map = new Map<string, Set<string>>();
  for (const r of data ?? []) map.set(r.teacher_id, (map.get(r.teacher_id) ?? new Set()).add(r.subject));
  return new Map([...map].map(([id, s]) => [id, [...s].join(', ')]));
}

// GET /api/salaries — accountant/admin: every staff member's salary settings and payments.
// Any other staff member: their own payments and salary settings.
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  if (user.role === 'student') return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
  const manager = hasPermission(user.role, 'manage_salaries');
  const userId = manager ? request.nextUrl.searchParams.get('userId') : user.id;

  try {
    const db = createAdminClient();
    let q = db.from('salary_payments').select('*').order('period', { ascending: false });
    if (userId) {
      if (!UUID.test(userId)) return NextResponse.json({ error: 'Invalid staff id.' }, { status: 400 });
      q = q.eq('user_id', userId);
    }
    const [{ data, error }, staffBy, subjects] = await Promise.all([q, loadAllStaff(db), subjectsBy(db)]);
    if (error) throw error;
    const payments = (data ?? []).map((r) => mapPayment(r, staffBy.get(r.user_id), subjects.get(r.user_id) ?? null));

    const staff = [...staffBy.values()]
      .filter((s) => (manager ? s.role !== 'admin' : s.userId === user.id))
      .map((s) => ({
        userId: s.userId,
        fullName: s.fullName,
        role: s.role,
        staffCode: s.staffCode,
        designation: s.designation,
        employmentStatus: s.employmentStatus,
        monthlySalary: s.monthlySalary,
        bankHolder: s.bankHolder,
        bankName: s.bankName,
        bankAccount: s.bankAccount,
        bankIfsc: s.bankIfsc,
        bankAccountType: s.bankAccountType,
        subjects: subjects.get(s.userId) ?? null,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    return NextResponse.json({ payments, staff, canManage: manager });
  } catch (err) {
    return serverError('salaries GET', err, 'Could not load salary records.');
  }
}

const line = z.object({ label: z.string().trim().min(1).max(80), amount: z.coerce.number().min(0).max(10_000_000) });
const paymentSchema = z.object({
  userId: z.string().uuid(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Choose the pay month'),
  earnings: z.array(line).min(1, 'Add at least the basic salary').max(15),
  deductions: z.array(line).max(15).default([]),
  status: z.enum(['pending', 'paid']),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  paymentMode: z.enum(PAYMENT_MODES).nullable().optional(),
  reference: z.string().trim().max(80).nullable().optional(),
  note: z.string().trim().max(300).nullable().optional(),
});

// POST /api/salaries — accountant records (or updates) a staff member's salary for a month.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('manage_salaries');
  if (!auth.ok) return auth.response;
  const parsed = paymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid salary record' }, { status: 400 });
  const p = parsed.data;
  if (p.status === 'paid' && (!p.paymentDate || !p.paymentMode)) {
    return NextResponse.json({ error: 'Enter the payment date and mode for a paid salary.' }, { status: 400 });
  }
  const earnings = p.earnings.filter((l) => l.amount > 0);
  const deductions = p.deductions.filter((l) => l.amount > 0);
  const gross = earnings.reduce((s, l) => s + l.amount, 0);
  const totalDeduction = deductions.reduce((s, l) => s + l.amount, 0);
  if (totalDeduction > gross) return NextResponse.json({ error: 'Deductions cannot be more than the gross salary.' }, { status: 400 });

  try {
    const db = createAdminClient();
    const { data: target } = await db.from('profiles').select('role, full_name').eq('id', p.userId).maybeSingle();
    if (!target || target.role === 'student' || target.role === 'admin') {
      return NextResponse.json({ error: 'Choose a teacher or accountant.' }, { status: 400 });
    }
    const row = {
      user_id: p.userId,
      period: `${p.period}-01`,
      earnings,
      deductions,
      gross,
      total_deduction: totalDeduction,
      net: gross - totalDeduction,
      status: p.status,
      payment_date: p.status === 'paid' ? p.paymentDate : null,
      payment_mode: p.status === 'paid' ? p.paymentMode : null,
      reference: p.reference || null,
      note: p.note || null,
      prepared_by: auth.user.fullName,
      prepared_by_id: auth.user.id,
      updated_at: new Date().toISOString(),
    };
    const { data: before } = await db.from('salary_payments').select('status').eq('user_id', p.userId).eq('period', row.period).maybeSingle();
    const { data, error } = await db.from('salary_payments').upsert(row, { onConflict: 'user_id,period' }).select('*').single();
    if (error) throw error;

    const label = periodLabel(p.period);
    await logActivity(db, auth.user, 'Salary recorded', `${target.full_name}: ${label}, net ₹${row.net} (${p.status})`);
    if (p.status === 'paid' && before?.status !== 'paid') {
      await notify(db, [p.userId], {
        title: `Salary for ${label} paid`,
        body: `Net ₹${row.net.toLocaleString('en-IN')} via ${p.paymentMode}. Your receipt is ready.`,
        link: '/teacher/profile?tab=salary',
      });
    }
    const [staffBy, subjects] = await Promise.all([loadAllStaff(db), subjectsBy(db)]);
    return NextResponse.json({ success: true, payment: mapPayment(data, staffBy.get(p.userId), subjects.get(p.userId) ?? null) });
  } catch (err) {
    return serverError('salaries POST', err, 'Could not save the salary record.');
  }
}

const settingsSchema = bankSchema.extend({
  userId: z.string().uuid(),
  monthlySalary: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
});

// PATCH /api/salaries — accountant sets a staff member's monthly salary and bank details.
export async function PATCH(request: NextRequest) {
  const auth = await requirePermission('manage_salaries');
  if (!auth.ok) return auth.response;
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid details' }, { status: 400 });
  const { userId, ...fields } = parsed.data;
  try {
    const db = createAdminClient();
    const { data: target } = await db.from('profiles').select('role, full_name').eq('id', userId).maybeSingle();
    if (!target || target.role === 'student') return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
    await saveStaffDetails(db, userId, target.role as UserRole, fields);
    await logActivity(db, auth.user, 'Salary settings updated', target.full_name ?? '');
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('salaries PATCH', err, 'Could not save the salary settings.');
  }
}

// DELETE /api/salaries?id=<uuid> — remove a salary record entered by mistake.
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission('manage_salaries');
  if (!auth.ok) return auth.response;
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !UUID.test(id)) return NextResponse.json({ error: 'A valid id is required.' }, { status: 400 });
  try {
    const db = createAdminClient();
    const { data, error } = await db.from('salary_payments').delete().eq('id', id).select('receipt_number');
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    await logActivity(db, auth.user, 'Salary record deleted', data[0].receipt_number);
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('salaries DELETE', err, 'Could not delete the salary record.');
  }
}
