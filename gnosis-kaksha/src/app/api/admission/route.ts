import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSessionClient } from '@/lib/supabase/server';
import { serverError } from '@/lib/authz';
import { calculateBill, calculateScholarship, SUBJECT_FEES } from '@/lib/fees';
import { normalizeUtr, UTR_PATTERN } from '@/lib/upi';
import { clientIp, rateLimit } from '@/lib/rate-limit';

const phone = z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

const admissionSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name is required').max(120),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    phone,
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth is required'),
    gender: z.string().trim().max(20).optional(),
    currentClass: z.coerce.number().int().min(5).max(12),
    board: z.enum(['SEBA', 'CBSE', 'ICSE']).default('SEBA'),
    schoolName: z.string().trim().min(2, 'School name is required').max(200),
    previousPercentage: z.coerce.number().min(0, 'Percentage must be 0–100').max(100, 'Percentage must be 0–100'),
    subjects: z.array(z.string()).min(1, 'Select at least one subject'),
    address: z.string().trim().min(5, 'Address is required').max(300),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().min(2).max(100),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode'),
    parentName: z.string().trim().min(2, 'Parent name is required').max(120),
    parentPhone: phone,
    documentType: z.string().trim().min(1).max(60),
    tshirtSize: z.string().trim().min(1).max(10),
    upiUtr: z.string().trim().min(1, 'Enter the UPI transaction ID'),
  })
  .superRefine((d, ctx) => {
    const offered = SUBJECT_FEES[d.currentClass] ?? {};
    const invalid = d.subjects.filter((s) => !(s in offered));
    if (invalid.length) {
      ctx.addIssue({ code: 'custom', path: ['subjects'], message: `Not offered for Class ${d.currentClass}: ${invalid.join(', ')}` });
    }
  });

// POST /api/admission — public. Creates the student record, the student's
// portal account (password chosen in the form) and a PENDING admission
// payment for the accountant to verify. Signs the new student in.
export async function POST(request: NextRequest) {
  if (!rateLimit(`admission:${clientIp(request.headers)}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many applications from this network. Please try again in an hour.' }, { status: 429 });
  }

  const parsed = admissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue?.message ?? 'Please check the form.', field: issue?.path?.[0] }, { status: 400 });
  }
  const d = parsed.data;
  const utr = normalizeUtr(d.upiUtr);
  if (!UTR_PATTERN.test(utr)) {
    return NextResponse.json(
      { error: 'That doesn’t look like a UPI transaction ID. It is usually a 12-digit number shown in your payment app.', field: 'upiUtr' },
      { status: 400 }
    );
  }

  const db = createAdminClient();
  let userId: string | null = null;
  let studentId: string | null = null;

  const rollback = async () => {
    if (studentId) await db.from('students').delete().eq('id', studentId);
    if (userId) await db.auth.admin.deleteUser(userId);
    studentId = null;
    userId = null;
  };

  try {
    const { count: utrUsed } = await db
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .ilike('utr', utr)
      .in('status', ['pending', 'verified']);
    if ((utrUsed ?? 0) > 0) {
      return NextResponse.json(
        { error: 'This UPI transaction ID has already been used. Check the ID in your payment app.', field: 'upiUtr' },
        { status: 409 }
      );
    }

    // 1. Portal account
    const { data: created, error: userErr } = await db.auth.admin.createUser({
      email: d.email,
      password: d.password,
      email_confirm: true,
      user_metadata: { full_name: d.fullName },
    });
    if (userErr || !created.user) {
      if (/already/i.test(userErr?.message ?? '')) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Each student needs their own email — or sign in if you have already applied.', field: 'email' },
          { status: 409 }
        );
      }
      throw userErr ?? new Error('createUser returned no user');
    }
    userId = created.user.id;

    // 2. Student record (fees computed server-side)
    const subjectFees = SUBJECT_FEES[d.currentClass];
    const scholarshipPercent = calculateScholarship(d.previousPercentage);
    const billing = calculateBill(
      d.subjects.map((name) => ({ name, monthly_fee: subjectFees[name] })),
      scholarshipPercent
    );
    const stream =
      d.currentClass >= 11 ? (d.subjects.includes('Physics') || d.subjects.includes('Chemistry') ? 'Science' : 'Arts') : null;

    const { data: student, error: stuErr } = await db
      .from('students')
      .insert({
        full_name: d.fullName,
        gender: d.gender || null,
        dob: d.dob,
        mobile: d.phone,
        email: d.email,
        parent_name: d.parentName,
        parent_phone: d.parentPhone,
        address: [d.address, d.city, d.state, d.pincode].join(', '),
        class_number: d.currentClass,
        stream,
        board: d.board,
        school_name: d.schoolName,
        previous_percentage: d.previousPercentage,
        subjects: d.subjects,
        scholarship_percent: scholarshipPercent,
        monthly_tuition: billing.monthlyTuition,
        tuition_after_scholarship: billing.tuitionAfterScholarship,
        mandatory_charges: billing.mandatoryCharges,
        tshirt_size: d.tshirtSize,
        document_type: d.documentType,
        status: 'pending',
        fee_state: 'pending_verification',
        amount_due: billing.tuitionAfterScholarship,
      })
      .select('id, registration_number, admission_date')
      .single();
    if (stuErr || !student) throw stuErr ?? new Error('student insert returned nothing');
    studentId = student.id;

    // 3. Link account -> student
    const { error: linkErr } = await db
      .from('profiles')
      .update({ student_id: student.id, full_name: d.fullName, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (linkErr) throw linkErr;

    // 4. Pending admission payment
    const txnId = `ADM-${Date.now().toString(36).toUpperCase()}`;
    const today = new Date().toISOString().slice(0, 10);
    const { error: txnErr } = await db.from('transactions').insert({
      id: txnId,
      student_id: student.id,
      student_name: d.fullName,
      description: 'Admission — Exam Fee, T-shirt & First Month',
      amount: billing.finalPayable,
      method: 'UPI',
      purpose: 'admission',
      utr,
      status: 'pending',
      date: today,
      submitted_by: userId,
    });
    if (txnErr) {
      await rollback();
      if (txnErr.code === '23505') {
        return NextResponse.json({ error: 'This UPI transaction ID has already been used.', field: 'upiUtr' }, { status: 409 });
      }
      throw txnErr;
    }

    // 5. Sign the new student in so "Enter Student Portal" works immediately.
    try {
      const session = await createSessionClient();
      await session.auth.signInWithPassword({ email: d.email, password: d.password });
    } catch (err) {
      console.warn('[admission] auto sign-in failed', err);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted. Your payment is awaiting verification by the office.',
        student: {
          id: student.id,
          registrationNumber: student.registration_number,
          fullName: d.fullName,
          classNumber: d.currentClass,
          email: d.email,
          monthlyTuition: billing.monthlyTuition,
          tuitionAfterScholarship: billing.tuitionAfterScholarship,
          mandatoryCharges: billing.mandatoryCharges,
          finalPayable: billing.finalPayable,
          admissionDate: student.admission_date,
        },
        receipt: { id: txnId, utr, amount: billing.finalPayable, date: today, status: 'pending' },
      },
      { status: 201 }
    );
  } catch (err) {
    await rollback().catch((e) => console.error('[admission] rollback failed', e));
    return serverError('admission', err, 'We could not submit your application. Nothing was saved — please try again.');
  }
}
