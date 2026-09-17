import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { calculateBill, SUBJECT_FEES, calculateScholarship } from '@/lib/fees';

// POST /api/payment/create-order
// Body: { subjects: string[], previousPercentage: number, currency?: string }
// Server re-calculates the amount from subjects — never trusts client-submitted price.
export async function POST(request: NextRequest) {
  try {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Payment gateway is not configured.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { subjects, previousPercentage, classNumber, currency = 'INR' } = body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { error: 'subjects array is required' },
        { status: 400 }
      );
    }

    if (classNumber === undefined || classNumber === null) {
      return NextResponse.json(
        { error: 'classNumber is required' },
        { status: 400 }
      );
    }

    // Server-side fee calculation — NEVER use client-submitted amount
    const subjectFees = SUBJECT_FEES[classNumber] || {};
    const selectedSubjects = (subjects as string[]).map((name) => ({
      name,
      monthly_fee: subjectFees[name] || 0,
    }));

    const scholarshipPercent = calculateScholarship(Number(previousPercentage) || 0);
    const { finalPayable } = calculateBill(selectedSubjects, scholarshipPercent);

    // Razorpay amount is in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(finalPayable * 100);

    if (amountInPaise <= 0) {
      return NextResponse.json(
        { error: 'Calculated payment amount is invalid' },
        { status: 400 }
      );
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt: `gk_${Date.now()}`,
      notes: {
        classNumber: String(classNumber),
        subjects: subjects.join(', '),
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: keyId,
    });
  } catch (error: any) {
    console.error('Razorpay create-order error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
