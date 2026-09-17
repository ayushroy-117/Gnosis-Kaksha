import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateBill, SUBJECT_FEES, calculateScholarship } from '@/lib/fees';

// POST /api/payment/verify
// Body: {
//   razorpay_order_id, razorpay_payment_id, razorpay_signature,
//   admissionData: { fullName, email, phone, classNumber, subjects, previousPercentage, ... }
// }
export async function POST(request: NextRequest) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { error: 'Payment gateway is not configured.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      admissionData,
    } = body;

    // ── 1. Mandatory field check ──────────────────────────────────────────────
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing Razorpay payment fields' },
        { status: 400 }
      );
    }

    if (!admissionData) {
      return NextResponse.json(
        { error: 'admissionData is required' },
        { status: 400 }
      );
    }

    // ── 2. HMAC SHA256 signature verification (mandatory) ────────────────────
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Razorpay signature mismatch — possible tampering');
      return NextResponse.json(
        { error: 'Payment verification failed. Invalid signature.' },
        { status: 400 }
      );
    }

    // ── 3. Server-side fee recalculation ─────────────────────────────────────
    const { classNumber, subjects, previousPercentage } = admissionData;
    const subjectFees = SUBJECT_FEES[classNumber] || {};
    const selectedSubjects = (subjects as string[]).map((name: string) => ({
      name,
      monthly_fee: subjectFees[name] || 0,
    }));
    const scholarshipPercent = calculateScholarship(Number(previousPercentage) || 0);
    const billing = calculateBill(selectedSubjects, scholarshipPercent);

    // ── 4. Determine stream ───────────────────────────────────────────────────
    const stream =
      classNumber >= 11
        ? subjects.includes('Physics') || subjects.includes('Chemistry')
          ? 'Science'
          : 'Arts'
        : null;

    // ── 5. Save to Supabase ───────────────────────────────────────────────────
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('students')
      .insert([
        {
          full_name: admissionData.fullName?.trim(),
          gender: admissionData.gender || null,
          dob: admissionData.dob || null,
          mobile: admissionData.phone?.trim(),
          email: admissionData.email?.trim().toLowerCase(),
          parent_name: admissionData.parentName?.trim(),
          parent_phone: admissionData.parentPhone?.trim(),
          address: admissionData.address?.trim(),
          class_number: classNumber,
          stream,
          board: admissionData.board || 'SEBA',
          school_name: admissionData.schoolName?.trim(),
          previous_percentage: Number(previousPercentage) || 0,
          subjects,
          scholarship_percent: scholarshipPercent,
          monthly_tuition: billing.monthlyTuition,
          tuition_after_scholarship: billing.tuitionAfterScholarship,
          mandatory_charges: billing.mandatoryCharges,
          tshirt_size: admissionData.tshirtSize || null,
          status: 'pending',
          fee_state: 'due',
          amount_due: billing.tuitionAfterScholarship,
        },
      ])
      .select('registration_number, id')
      .single();

    if (error) {
      console.error('Supabase admission insert error:', error);
      return NextResponse.json(
        { error: 'Admission saved but DB write failed. Contact admin.' },
        { status: 500 }
      );
    }

    // ── 6. Record the payment transaction ────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('transactions').insert([
      {
        id: `RCPT-${Date.now()}`,
        student_id: data.id,
        student_name: admissionData.fullName?.trim(),
        description: `Admission — Exam Fee, T-shirt & First Month | Razorpay ${razorpay_payment_id}`,
        amount: billing.finalPayable,
        method: 'UPI',
        utr: razorpay_payment_id,
        status: 'verified',
        date: today,
      },
    ]);

    return NextResponse.json({
      success: true,
      admissionId: data.id,
      registrationNumber: data.registration_number,
      message: 'Payment verified and admission saved successfully.',
    });
  } catch (error: any) {
    console.error('Payment verify error:', error);
    return NextResponse.json(
      { error: error?.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
