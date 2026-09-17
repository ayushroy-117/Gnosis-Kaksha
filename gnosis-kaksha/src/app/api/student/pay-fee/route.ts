import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/student/pay-fee
// Body: { studentId, amount, utr, method }
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const body = await request.json();
    const { studentId, identifier, amount, utr, method } = body;

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

    // Find student
    let studentQuery = supabase.from('students').select('id, full_name, tuition_after_scholarship');

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
    const paymentMethod = (method as 'UPI' | 'Cash' | 'Card' | 'Bank Transfer') || 'UPI';

    // Record transaction
    const { data: receipt, error: txnError } = await supabase
      .from('transactions')
      .insert([
        {
          id: `RCPT-${Date.now()}`,
          student_id: student.id,
          student_name: student.full_name,
          description: `Monthly Tuition — ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} (UTR: ${utr.trim()})`,
          amount: paymentAmount,
          method: paymentMethod,
          utr: utr.trim(),
          status: 'verified',
          date: today,
        },
      ])
      .select()
      .single();

    if (txnError) {
      console.error('Transaction insert error:', txnError);
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }

    // Mark student fee as paid
    await supabase
      .from('students')
      .update({ fee_state: 'paid', amount_due: 0, updated_at: new Date().toISOString() })
      .eq('id', student.id);

    return NextResponse.json({
      success: true,
      message: 'Monthly tuition payment recorded successfully!',
      receipt,
      feeState: 'paid',
      amountDue: 0,
    });
  } catch (error: any) {
    console.error('Student pay-fee error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process fee payment' },
      { status: 500 }
    );
  }
}
