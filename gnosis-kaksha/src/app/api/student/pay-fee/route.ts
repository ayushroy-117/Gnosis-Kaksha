import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapStudent, mapTransaction, outstandingFor } from '@/lib/server/institute';
import { currentPeriodLabel } from '@/lib/institute-data';
import { normalizeUtr, UTR_PATTERN } from '@/lib/upi';
import { rateLimit } from '@/lib/rate-limit';

const bodySchema = z.object({
  utr: z.string().trim().min(1, 'Enter the UPI transaction ID from your payment app.'),
  upiReference: z.string().trim().max(64).optional(),
});

// POST /api/student/pay-fee — the signed-in student submits the UPI transaction
// ID for what they owe. Creates a PENDING transaction for the accountant to
// review. The amount is computed server-side, never taken from the client.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('submit_payment');
  if (!auth.ok) return auth.response;
  const { user } = auth;
  if (!user.studentId) {
    return NextResponse.json({ error: 'This account is not linked to a student record.' }, { status: 403 });
  }
  if (!rateLimit(`pay:${user.id}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const utr = normalizeUtr(parsed.data.utr);
  if (!UTR_PATTERN.test(utr)) {
    return NextResponse.json(
      { error: 'That doesn’t look like a UPI transaction ID. It is usually a 12-digit number shown in your payment app after paying.' },
      { status: 400 }
    );
  }

  try {
    const db = createAdminClient();
    const { data: row, error: stuErr } = await db.from('students').select('*').eq('id', user.studentId).single();
    if (stuErr || !row) return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    const student = mapStudent(row);

    if (student.status === 'rejected') {
      return NextResponse.json({ error: 'Your admission was not approved. Please contact the office.' }, { status: 409 });
    }

    const { count: pendingCount } = await db
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .eq('status', 'pending');
    if ((pendingCount ?? 0) > 0) {
      return NextResponse.json(
        { error: 'You already have a payment awaiting verification. Please wait for the office to review it.' },
        { status: 409 }
      );
    }

    const { amount, purpose } = outstandingFor(student);
    if (amount <= 0) {
      return NextResponse.json({ error: 'You have no outstanding dues right now.' }, { status: 409 });
    }

    const description =
      purpose === 'admission'
        ? 'Admission — Exam Fee, T-shirt & First Month'
        : `Monthly Tuition — ${currentPeriodLabel()}`;

    const { data: txn, error } = await db
      .from('transactions')
      .insert({
        id: `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        student_id: student.id,
        student_name: student.fullName,
        description,
        amount,
        method: 'UPI',
        purpose,
        utr,
        upi_reference: parsed.data.upiReference || null,
        status: 'pending',
        date: new Date().toISOString().slice(0, 10),
        submitted_by: user.id,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505' && /one_pending/.test(error.message)) {
        return NextResponse.json(
          { error: 'You already have a payment awaiting verification. Please wait for the office to review it.' },
          { status: 409 }
        );
      }
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This UPI transaction ID has already been submitted. Check the ID, or contact the office if you think this is a mistake.' },
          { status: 409 }
        );
      }
      throw error;
    }

    await db
      .from('students')
      .update({ fee_state: 'pending_verification', updated_at: new Date().toISOString() })
      .eq('id', student.id);

    return NextResponse.json({
      success: true,
      message: 'Payment submitted. The office will verify it shortly.',
      transaction: mapTransaction(txn),
    }, { status: 201 });
  } catch (err) {
    return serverError('student/pay-fee', err, 'Could not submit your payment. Please try again.');
  }
}
