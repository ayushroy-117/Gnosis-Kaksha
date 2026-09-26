import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { submitUpiPayment } from '@/lib/institute-store';

// POST /api/student/pay-fee
// Body: { studentId, identifier, amount, utr, upiReference, method }
// Now stores as PENDING — accountant must approve before it becomes 'paid'.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, identifier, amount, utr, upiReference, method } = body;

    if (!amount || (!studentId && !identifier)) {
      return NextResponse.json(
        { error: 'Missing required fields: student identifier and amount' },
        { status: 400 }
      );
    }

    if (!utr || utr.trim().length < 6) {
      return NextResponse.json(
        { error: 'Valid UPI UTR / Transaction ID is required (min 6 characters)' },
        { status: 400 }
      );
    }

    if (!upiReference) {
      return NextResponse.json(
        { error: 'upiReference is required (the unique QR transaction reference)' },
        { status: 400 }
      );
    }

    // ── Supabase path (if DB is configured) ─────────────────────────────────
    const supabase = createAdminClient();
    if (supabase) {
      let studentQuery = supabase
        .from('students')
        .select('id, full_name, tuition_after_scholarship');

      if (studentId) {
        studentQuery = studentQuery.eq('id', studentId);
      } else if (identifier) {
        const isRegNo = identifier.trim().toUpperCase().startsWith('GK-');
        if (isRegNo) {
          studentQuery = studentQuery.eq('registration_number', identifier.trim().toUpperCase());
        } else {
          studentQuery = studentQuery.eq('email', identifier.trim().toLowerCase());
        }
      }

      const { data: student } = await studentQuery.single();

      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      const today = new Date().toISOString().split('T')[0];
      const paymentAmount = Number(amount);
      const pendingId = `PAY-${Date.now().toString(36).toUpperCase()}`;

      // Record as pending — NOT verified yet
      const { data: receipt, error: txnError } = await supabase
        .from('transactions')
        .insert([
          {
            id: pendingId,
            student_id: student.id,
            student_name: student.full_name,
            description: `Monthly Tuition — ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} (Ref: ${upiReference}) (Pending Verification)`,
            amount: paymentAmount,
            method: method || 'UPI',
            utr: utr.trim(),
            status: 'pending',
            date: today,
          },
        ])
        .select()
        .single();

      if (txnError) {
        console.error('Transaction insert error:', txnError);
        return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
      }

      // Touch student updated_at (fee_state in Supabase DB stays 'due' until accountant approves)
      await supabase
        .from('students')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id);

      return NextResponse.json({
        success: true,
        message: 'Payment submitted. Pending accountant verification.',
        receipt,
        feeState: 'pending_verification',
        pendingVerification: true,
      });
    }

    // ── In-memory store path (no DB) ─────────────────────────────────────────
    // Resolve studentId from identifier when no DB
    let resolvedId = studentId;
    if (!resolvedId && identifier) {
      // import happens lazily — only used in demo/no-DB mode
      const { getStudentByRegNo, getStudentByEmail, getStudentById } = await import('@/lib/institute-store');
      const clean = identifier.trim();
      const stu =
        getStudentByRegNo(clean) ||
        getStudentByEmail(clean) ||
        getStudentById(clean);
      if (!stu) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      resolvedId = stu.id;
    }

    const receipt = submitUpiPayment(resolvedId, Number(amount), utr.trim(), upiReference);
    if (!receipt) {
      return NextResponse.json({ error: 'Student not found in store' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment submitted. Pending accountant verification.',
      receipt,
      feeState: 'pending_verification',
      pendingVerification: true,
    });
  } catch (error: any) {
    console.error('Student pay-fee error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process fee payment' },
      { status: 500 }
    );
  }
}
