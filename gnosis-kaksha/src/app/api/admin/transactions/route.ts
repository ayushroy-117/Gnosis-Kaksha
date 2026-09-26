import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRoster, getTransactions, mapStudent, mapTransaction, staffBranchScope } from '@/lib/server/institute';
import { currentPeriodLabel } from '@/lib/institute-data';
import { normalizeUtr, UTR_PATTERN } from '@/lib/upi';

export const dynamic = 'force-dynamic';

// GET /api/admin/transactions?status=pending&student_id=<uuid> — ledger (accountant/admin)
export async function GET(request: NextRequest) {
  const auth = await requirePermission('view_financials');
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const studentId = searchParams.get('student_id') || undefined;
    const db = createAdminClient();
    let transactions = await getTransactions(db, studentId);
    if (status) transactions = transactions.filter((t) => t.status === status);
    const branch = staffBranchScope(auth.user);
    if (branch) {
      const inBranch = new Set((await getRoster(db)).filter((s) => s.branchId === branch).map((s) => s.id));
      transactions = transactions.filter((t) => inBranch.has(t.studentId));
    }
    return NextResponse.json({ transactions });
  } catch (err) {
    return serverError('admin/transactions GET', err, 'Could not load transactions.');
  }
}

const recordSchema = z.object({
  studentId: z.string().uuid(),
  amount: z.coerce.number().positive('Amount must be greater than zero').max(1_000_000),
  method: z.enum(['Cash', 'UPI', 'Card', 'Bank Transfer']),
  description: z.string().trim().max(300).optional(),
  utr: z.string().trim().max(64).optional(),
});

// POST /api/admin/transactions — record a payment taken at the counter (accountant/admin).
// Recorded directly as verified with a receipt number.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('record_payment');
  if (!auth.ok) return auth.response;

  const parsed = recordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const { studentId, amount, method, description } = parsed.data;
  let utr: string | null = null;
  if (method !== 'Cash') {
    utr = normalizeUtr(parsed.data.utr ?? '');
    if (!UTR_PATTERN.test(utr)) {
      return NextResponse.json({ error: 'Enter the transaction ID / UTR for non-cash payments.' }, { status: 400 });
    }
  }

  try {
    const db = createAdminClient();
    const { data: row } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
    if (!row) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    const student = mapStudent(row);
    const branch = staffBranchScope(auth.user);
    if (branch && student.branchId !== branch) return NextResponse.json({ error: 'That student is at another branch.' }, { status: 403 });

    const id = `CTR-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await db.from('transactions').insert({
      id,
      student_id: student.id,
      student_name: student.fullName,
      description: description || `Monthly Tuition — ${currentPeriodLabel()} (counter)`,
      amount,
      method,
      purpose: student.status === 'pending' ? 'admission' : 'tuition',
      utr,
      status: 'pending',
      date: new Date().toISOString().slice(0, 10),
      submitted_by: auth.user.id,
    });
    if (error) {
      if (error.code === '23505' && /one_pending/.test(error.message)) {
        return NextResponse.json({ error: 'This student has a UPI submission awaiting review. Approve or reject it first.' }, { status: 409 });
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This transaction ID is already recorded against another payment.' }, { status: 409 });
      }
      throw error;
    }

    // Counter payments are verified on the spot by the person recording them.
    const { data: verified, error: reviewErr } = await db.rpc('review_payment', {
      p_transaction_id: id,
      p_action: 'approve',
      p_note: null,
      p_reviewer: `${auth.user.fullName} (${auth.user.role}, counter)`,
    });
    if (reviewErr) throw reviewErr;

    return NextResponse.json({ success: true, transaction: mapTransaction(verified) }, { status: 201 });
  } catch (err) {
    return serverError('admin/transactions POST', err, 'Could not record the payment.');
  }
}
