import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRoster } from '@/lib/server/institute';

export const dynamic = 'force-dynamic';

// GET /api/admin/students?status=pending|active|rejected&class=10&q=term
// Full student records (incl. fees) — accountant/admin.
export async function GET(request: NextRequest) {
  const auth = await requirePermission('view_student_records');
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const classNum = Number(searchParams.get('class')) || null;
    const q = searchParams.get('q')?.trim().toLowerCase();

    let students = await getRoster(createAdminClient());
    if (status) students = students.filter((s) => s.status === status);
    if (classNum) students = students.filter((s) => s.classNumber === classNum);
    if (q) {
      students = students.filter((s) =>
        [s.fullName, s.registrationNumber, s.email].some((v) => v.toLowerCase().includes(q))
      );
    }
    return NextResponse.json({ students, total: students.length });
  } catch (err) {
    return serverError('admin/students GET', err, 'Could not load students.');
  }
}
