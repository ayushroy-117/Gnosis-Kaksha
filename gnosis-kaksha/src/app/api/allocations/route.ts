import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAllocations, mapAllocation, teacherScopeFor } from '@/lib/server/institute';
import { canTeach } from '@/lib/institute-data';
import { SUBJECT_FEES } from '@/lib/fees';

export const dynamic = 'force-dynamic';

// GET /api/allocations — subject allocation requests (teacher/accountant/admin)
export async function GET() {
  const auth = await requirePermission('view_allocations');
  if (!auth.ok) return auth.response;
  try {
    const db = createAdminClient();
    const [all, scope] = await Promise.all([getAllocations(db), teacherScopeFor(db, auth.user)]);
    return NextResponse.json({ allocations: all.filter((a) => canTeach(scope, a.subject, a.classNumber)) });
  } catch (err) {
    return serverError('allocations GET', err, 'Could not load allocation requests.');
  }
}

const createSchema = z.object({
  studentId: z.string().uuid('Choose a student'),
  subject: z.string().trim().min(1, 'Choose a subject'),
});

// POST /api/allocations — teacher asks for a subject to be added to a student.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('request_allocation');
  if (!auth.ok) return auth.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }
  const { studentId, subject } = parsed.data;

  try {
    const db = createAdminClient();
    const { data: student } = await db
      .from('students')
      .select('id, full_name, registration_number, class_number, subjects, status')
      .eq('id', studentId)
      .maybeSingle();
    if (!student || student.status !== 'active') {
      return NextResponse.json({ error: 'Student not found or not currently enrolled.' }, { status: 404 });
    }
    if (!canTeach(await teacherScopeFor(db, auth.user), subject, student.class_number)) {
      return NextResponse.json({ error: `You are not assigned to teach ${subject} for Class ${student.class_number}. Ask the admin to update your subjects.` }, { status: 403 });
    }
    if (!((SUBJECT_FEES[student.class_number] ?? {}) as Record<string, number>)[subject]) {
      return NextResponse.json({ error: `${subject} is not offered for Class ${student.class_number}.` }, { status: 400 });
    }
    if ((student.subjects as string[]).includes(subject)) {
      return NextResponse.json({ error: `${student.full_name} is already enrolled in ${subject}.` }, { status: 409 });
    }
    const { count } = await db
      .from('allocation_requests')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('subject', subject)
      .eq('status', 'PENDING');
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: 'A request for this subject is already pending.' }, { status: 409 });
    }

    const { data, error } = await db
      .from('allocation_requests')
      .insert({
        id: `alloc-${Date.now().toString(36)}`,
        student_id: student.id,
        student_name: student.full_name,
        registration_number: student.registration_number,
        subject,
        class_number: student.class_number,
        requested_by: auth.user.fullName,
        requested_by_id: auth.user.id,
        status: 'PENDING',
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, allocation: mapAllocation(data) }, { status: 201 });
  } catch (err) {
    return serverError('allocations POST', err, 'Could not submit the request.');
  }
}

const resolveSchema = z.discriminatedUnion('resolution', [
  z.object({ id: z.string().min(1), resolution: z.literal('APPROVED') }),
  z.object({ id: z.string().min(1), resolution: z.literal('REJECTED'), rejectionNote: z.string().trim().min(3, 'Give a reason (at least 3 characters).').max(500) }),
]);

// PATCH /api/allocations — accountant/admin approves (adds subject + fee) or rejects.
export async function PATCH(request: NextRequest) {
  const auth = await requirePermission('resolve_allocation');
  if (!auth.ok) return auth.response;
  const parsed = resolveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 });
  }
  const body = parsed.data;

  try {
    const db = createAdminClient();
    const { data: req } = await db.from('allocation_requests').select('*').eq('id', body.id).maybeSingle();
    if (!req) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    if (req.status !== 'PENDING') return NextResponse.json({ error: `Already ${req.status.toLowerCase()}.` }, { status: 409 });

    if (body.resolution === 'APPROVED') {
      const { data: s } = await db
        .from('students')
        .select('id, subjects, class_number, scholarship_percent')
        .eq('id', req.student_id)
        .maybeSingle();
      if (!s) return NextResponse.json({ error: 'Student no longer exists.' }, { status: 404 });
      const subjects = Array.from(new Set([...(s.subjects as string[]), req.subject]));
      const fees = SUBJECT_FEES[s.class_number] ?? {};
      const monthly = subjects.reduce((sum, name) => sum + (fees[name] ?? 0), 0);
      const afterScholarship = monthly - Math.round((monthly * Number(s.scholarship_percent ?? 0)) / 100);
      const { error } = await db
        .from('students')
        .update({ subjects, monthly_tuition: monthly, tuition_after_scholarship: afterScholarship, updated_at: new Date().toISOString() })
        .eq('id', s.id);
      if (error) throw error;
    }

    const { data, error } = await db
      .from('allocation_requests')
      .update({
        status: body.resolution,
        rejection_note: body.resolution === 'REJECTED' ? body.rejectionNote : null,
        resolved_at: new Date().toISOString().slice(0, 10),
        resolved_by: `${auth.user.fullName} (${auth.user.role})`,
      })
      .eq('id', body.id)
      .eq('status', 'PENDING')
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, allocation: mapAllocation(data) });
  } catch (err) {
    return serverError('allocations PATCH', err, 'Could not update the request.');
  }
}
