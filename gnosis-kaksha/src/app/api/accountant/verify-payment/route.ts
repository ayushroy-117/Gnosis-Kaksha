import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { approveUpiPayment, rejectUpiPayment } from '@/lib/institute-store';

// POST /api/accountant/verify-payment
// Body: { transactionId, action: 'approve' | 'reject', rejectedNote?, verifiedBy? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, action, rejectedNote, verifiedBy } = body;

    if (!transactionId || !action) {
      return NextResponse.json(
        { error: 'transactionId and action are required' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    if (action === 'reject' && (!rejectedNote || rejectedNote.trim().length < 3)) {
      return NextResponse.json(
        { error: 'A rejection reason (rejectedNote) is required' },
        { status: 400 }
      );
    }

    const now = new Date();
    const verifiedAt = now.toISOString().split('T')[0];

    // ── Supabase path ────────────────────────────────────────────────────────
    const supabase = createAdminClient();
    if (supabase) {
      // Fetch the pending transaction
      const { data: txn, error: fetchErr } = await supabase
        .from('transactions')
        .select('*, students(id, full_name)')
        .eq('id', transactionId)
        .single();

      if (fetchErr || !txn) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }

      if (txn.status !== 'pending') {
        return NextResponse.json(
          { error: `Transaction is already ${txn.status}` },
          { status: 409 }
        );
      }

      if (action === 'approve') {
        // Count existing verified to generate receipt number
        const { count } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'verified');

        const rcptId = `RCPT-${now.getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
        const cleanDesc = txn.description?.replace(' (Pending Verification)', '') ?? txn.description;

        await supabase
          .from('transactions')
          .update({
            id: rcptId,
            status: 'verified',
            description: `${cleanDesc} | Verified by ${verifiedBy || 'Accountant'} on ${verifiedAt}`,
          })
          .eq('id', transactionId);

        await supabase
          .from('students')
          .update({
            fee_state: 'paid',
            amount_due: 0,
            updated_at: now.toISOString(),
          })
          .eq('id', txn.student_id);

        return NextResponse.json({
          success: true,
          action: 'approved',
          receiptId: rcptId,
          receipt: {
            id: rcptId,
            student_id: txn.student_id,
            student_name: txn.student_name,
            amount: txn.amount,
            method: txn.method,
            utr: txn.utr,
            status: 'verified',
            date: verifiedAt,
            description: cleanDesc,
          },
          message: `Payment approved and receipt ${rcptId} generated.`,
        });
      } else {
        // reject — DB check constraint is status in ('verified', 'pending', 'failed')
        await supabase
          .from('transactions')
          .update({
            status: 'failed',
            description: `${txn.description || 'Payment'} | Rejection Note: ${rejectedNote.trim()} | Verified by ${verifiedBy || 'Accountant'}`,
          })
          .eq('id', transactionId);

        await supabase
          .from('students')
          .update({
            fee_state: 'due',
            updated_at: now.toISOString(),
          })
          .eq('id', txn.student_id);

        return NextResponse.json({
          success: true,
          action: 'rejected',
          message: 'Payment rejected. Student has been notified to retry.',
        });
      }
    }

    // ── In-memory store path ──────────────────────────────────────────────────
    if (action === 'approve') {
      const result = approveUpiPayment(transactionId, verifiedBy || 'Accountant');
      if (!result) {
        return NextResponse.json(
          { error: 'Transaction not found or already processed' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        action: 'approved',
        receiptId: result.transaction.id,
        receipt: result.transaction,
        message: `Payment approved and receipt ${result.transaction.id} generated.`,
      });
    } else {
      const txn = rejectUpiPayment(
        transactionId,
        rejectedNote.trim(),
        verifiedBy || 'Accountant'
      );
      if (!txn) {
        return NextResponse.json(
          { error: 'Transaction not found or already processed' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        action: 'rejected',
        message: 'Payment rejected. Student has been notified to retry.',
      });
    }
  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process verification' },
      { status: 500 }
    );
  }
}
