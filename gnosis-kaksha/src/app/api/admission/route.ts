import { NextRequest, NextResponse } from 'next/server';
import { addAdmission, getAllStudents } from '@/lib/institute-store';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.fullName || !body.email || !body.phone || !body.currentClass || !body.subjects) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName, email, phone, currentClass, subjects' },
        { status: 400 }
      );
    }

    if (!body.upiUtr || body.upiUtr.trim().length < 6) {
      return NextResponse.json(
        { error: 'Valid UPI Transaction / UTR number is required to confirm admission' },
        { status: 400 }
      );
    }

    // 1. Add to unified persistent institute store
    const { student, receipt } = addAdmission({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      dob: body.dob,
      currentClass: body.currentClass,
      schoolName: body.schoolName,
      previousPercentage: body.previousPercentage || '0',
      subjects: body.subjects,
      address: body.address,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      parentName: body.parentName,
      parentPhone: body.parentPhone,
      documentType: body.documentType,
      tshirtSize: body.tshirtSize || 'm',
      upiUtr: body.upiUtr.trim(),
    });

    // 2. If Supabase admin client is configured, attempt sync
    const supabase = createAdminClient();
    if (supabase) {
      try {
        await supabase.from('students').insert([
          {
            id: student.id,
            registration_number: student.registrationNumber,
            full_name: student.fullName,
            class_number: student.classNumber,
            stream: student.stream,
            board: student.board,
            parent_name: student.parentName,
            mobile: student.mobile,
            email: student.email,
            previous_percentage: student.previousPercentage,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (sbErr) {
        console.warn('Supabase sync warning in admission:', sbErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Admission application and payment submitted successfully',
        student: {
          id: student.id,
          registrationNumber: student.registrationNumber,
          fullName: student.fullName,
          classNumber: student.classNumber,
          email: student.email,
          monthlyTuition: student.monthlyTuition,
          tuitionAfterScholarship: student.tuitionAfterScholarship,
          mandatoryCharges: student.mandatoryCharges,
          totalPaid: receipt.amount,
          admissionDate: student.admissionDate,
        },
        receipt: {
          id: receipt.id,
          amount: receipt.amount,
          utr: receipt.utr,
          date: receipt.date,
          method: receipt.method,
        },
        credentials: {
          identifier: student.registrationNumber,
          email: student.email,
          defaultPassword: 'gk2026',
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error processing admission:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process admission form' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const students = getAllStudents();
  return NextResponse.json({
    students,
    total: students.length,
  });
}
