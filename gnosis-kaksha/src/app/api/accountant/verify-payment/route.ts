import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapTransaction } from '@/lib/server/institute';

const bodySchema = z.discriminatedUnion('action', [
  z.object({ transactionId: z.string().min(1).max(100), action: z.literal('approve') }),
  z.object({
    transactionId: z.string().min(1).max(100),
    action: z.literal('reject'),
    rejectedNote: z.string().trim().min(3, 'Give a reason for the rejection (at least 3 characters).').max(500),
  }),
]);

// POST /api/accountant/verify-payment — approve or reject a pending UPI submission.
// Accountant or admin. Approval issues a receipt number, clears the dues and,
// for an admission payment, activates the student's admission.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('review_payments');
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const body = parsed.data;
  const reviewer = `${auth.user.fullName} (${auth.user.role})`;

  try {
    const db = createAdminClient();
    const { data, error } = await db.rpc('review_payment', {
      p_transaction_id: body.transactionId,
      p_action: body.action,
      p_note: body.action === 'reject' ? body.rejectedNote : null,
      p_reviewer: reviewer,
    });

    if (error) {
      if (error.code === 'P0002') return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
      if (error.code === '55000') {
        return NextResponse.json({ error: `This payment was already processed (${error.message.replace('transaction is already ', '')}). Refresh the queue.` }, { status: 409 });
      }
      if (error.code === '22023') return NextResponse.json({ error: error.message }, { status: 400 });
      throw error;
    }

    const txn = mapTransaction(data);
    return NextResponse.json({
      success: true,
      action: body.action === 'approve' ? 'approved' : 'rejected',
      transaction: txn,
      receiptId: txn.receiptNumber,
      message:
        body.action === 'approve'
          ? `Payment approved. Receipt ${txn.receiptNumber} issued.`
          : 'Payment rejected. The student will see the reason and can resubmit.',
    });
  } catch (err) {
    return serverError('accountant/verify-payment', err, 'Could not process this payment. Please try again.');
  }
}
