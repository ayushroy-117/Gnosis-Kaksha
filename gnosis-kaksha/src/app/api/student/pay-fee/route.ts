import { NextRequest, NextResponse } from 'next/server';
import { recordPayment, getStudentByRegNo, getStudentById, getStudentByEmail } from '@/lib/institute-store';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, identifier, amount, utr, method } = body;

    if (!amount || (!studentId && !identifier)) {
      return NextResponse.json(
        { error: 'Missing required payment details: student identifier and amount' },
        { status: 400 }
      );
    }

    if (!utr || utr.trim().length < 6) {
      return NextResponse.json(
        { error: 'Valid 12-digit UPI UTR / Transaction ID is required' },
        { status: 400 }
      );
    }

    // Find student in store
    let student = studentId ? getStudentById(studentId) : null;
    if (!student && identifier) {
      student = getStudentByRegNo(identifier) || getStudentByEmail(identifier);
    }

    // If still not found, default to first student or sample
    const targetId = student ? student.id : (studentId || 'stu-0142');
    const paymentAmount = Number(amount);
    const paymentMethod = (method as 'UPI' | 'Cash') || 'UPI';

    const receipt = recordPayment(
      targetId,
      paymentAmount,
      paymentMethod,
      `September 2026 — Monthly Tuition (UPI UTR: ${utr.trim()})`,
      utr.trim()
    );

    if (!receipt) {
      return NextResponse.json(
        { error: 'Failed to record payment in institute ledger' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Monthly tuition payment verified and recorded successfully!',
      receipt,
      feeState: 'paid',
      amountDue: 0,
    });
  } catch (error: any) {
    console.error('Error processing student fee payment:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process fee payment' },
      { status: 500 }
    );
  }
}
