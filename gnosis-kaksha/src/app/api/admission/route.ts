import { NextRequest, NextResponse } from 'next/server';
import { calculateBill, calculateScholarship, SUBJECT_FEES } from '@/lib/fees';

// Mock data storage (in-memory)
const admissions: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.fullName || !body.email || !body.phone || !body.currentClass || !body.subjects) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Server-side fee validation
    const classNum = parseInt(body.currentClass);
    const subjectFees = SUBJECT_FEES[classNum] || {};
    const percentage = parseInt(body.previousPercentage || '0');
    const scholarship = calculateScholarship(percentage);

    const selectedSubjectsData = body.subjects.map((subject: string) => ({
      name: subject,
      monthly_fee: subjectFees[subject] || 0,
    }));

    const billing = calculateBill(selectedSubjectsData, scholarship);

    // Create admission record
    const admission = {
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      ...body,
      billing,
      status: 'pending',
    };

    // Mock: Save to "database" (in production, use Supabase)
    admissions.push(admission);

    return NextResponse.json(
      {
        success: true,
        message: 'Admission form submitted successfully',
        admissionId: admission.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing admission:', error);
    return NextResponse.json(
      { error: 'Failed to process admission form' },
      { status: 500 }
    );
  }
}

// Get all admissions (mock endpoint)
export async function GET() {
  return NextResponse.json({
    admissions,
    total: admissions.length,
  });
}
