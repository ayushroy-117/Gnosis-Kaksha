import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateBill, SUBJECT_FEES, calculateScholarship } from '@/lib/fees';

// POST /api/admission — offline payment path (UPI UTR submitted manually)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      fullName, email, phone, dob, gender,
      currentClass, schoolName, previousPercentage,
      subjects, address, city, state, pincode,
      parentName, parentPhone, documentType,
      tshirtSize, upiUtr, board,
    } = body;

    // ── Validate required fields ──────────────────────────────────────────────
    if (!fullName || !phone || !currentClass || !subjects || !Array.isArray(subjects)) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName, phone, currentClass, subjects' },
        { status: 400 }
      );
    }

    if (!upiUtr || upiUtr.trim().length < 6) {
      return NextResponse.json(
        { error: 'Valid UPI Transaction / UTR number is required' },
        { status: 400 }
      );
    }

    // ── Server-side fee calculation ───────────────────────────────────────────
    const classNum = parseInt(currentClass);
    const subjectFees = SUBJECT_FEES[classNum] || {};
    const prevPercent = parseFloat(previousPercentage) || 0;
    const scholarshipPercent = calculateScholarship(prevPercent);

    const selectedSubjects = (subjects as string[]).map((name) => ({
      name,
      monthly_fee: subjectFees[name] || 0,
    }));

    const billing = calculateBill(selectedSubjects, scholarshipPercent);

    const stream =
      classNum >= 11
        ? subjects.includes('Physics') || subjects.includes('Chemistry')
          ? 'Science'
          : 'Arts'
        : null;

    // ── Save to Supabase ──────────────────────────────────────────────────────
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('students')
      .insert([
        {
          full_name: fullName.trim(),
          gender: gender || null,
          dob: dob || null,
          mobile: phone.trim(),
          email: email?.trim().toLowerCase() || null,
          parent_name: parentName?.trim() || null,
          parent_phone: parentPhone?.trim() || null,
          address: [address, city, state, pincode].filter(Boolean).join(', '),
          class_number: classNum,
          stream,
          board: board || 'SEBA',
          school_name: schoolName?.trim() || null,
          previous_percentage: prevPercent,
          subjects,
          scholarship_percent: scholarshipPercent,
          monthly_tuition: billing.monthlyTuition,
          tuition_after_scholarship: billing.tuitionAfterScholarship,
          mandatory_charges: billing.mandatoryCharges,
          tshirt_size: tshirtSize || null,
          document_type: documentType || null,
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
        { error: 'Failed to save admission. Please try again.' },
        { status: 500 }
      );
    }

    // ── Record offline payment transaction ────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('transactions').insert([
      {
        id: `RCPT-${Date.now()}`,
        student_id: data.id,
        student_name: fullName.trim(),
        description: `Admission (Offline) — Exam Fee, T-shirt & First Month | UTR: ${upiUtr.trim()}`,
        amount: billing.finalPayable,
        method: 'UPI',
        utr: upiUtr.trim(),
        status: 'pending', // pending until admin verifies
        date: today,
      },
    ]);

    return NextResponse.json(
      {
        success: true,
        message: 'Admission submitted successfully. Pending admin approval.',
        student: {
          id: data.id,
          registrationNumber: data.registration_number,
          fullName: fullName.trim(),
          classNumber: classNum,
          email: email?.trim() || null,
          monthlyTuition: billing.monthlyTuition,
          tuitionAfterScholarship: billing.tuitionAfterScholarship,
          mandatoryCharges: billing.mandatoryCharges,
          finalPayable: billing.finalPayable,
          admissionDate: today,
        },
        receipt: {
          id: `RCPT-${Date.now()}`,
          utr: upiUtr.trim(),
          amount: billing.finalPayable,
          date: today,
          status: 'pending',
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Admission API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process admission form' },
      { status: 500 }
    );
  }
}

// GET /api/admission — list all admissions (admin use)
export async function GET() {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch admissions' }, { status: 500 });
    }

    return NextResponse.json({ students: data || [], total: data?.length || 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
