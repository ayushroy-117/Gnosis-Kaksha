import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildStudentData } from '@/lib/server/institute';

export const dynamic = 'force-dynamic';

// GET /api/data/student           — the signed-in student's own portal data
// GET /api/data/student?as=<uuid> — admin only: view any student's portal
export async function GET(request: NextRequest) {
  const auth = await requirePermission('view_own_portal');
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const as = request.nextUrl.searchParams.get('as');
  let studentId: string | null = user.studentId;
  if (user.role === 'admin') {
    if (!as) {
      return NextResponse.json({ error: 'Choose a student from Admin → Students to view their portal.' }, { status: 400 });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(as)) {
      return NextResponse.json({ error: 'Invalid student id.' }, { status: 400 });
    }
    studentId = as;
  }
  if (!studentId) {
    return NextResponse.json({ error: 'This account is not linked to a student record. Contact the institute office.' }, { status: 404 });
  }

  try {
    const data = await buildStudentData(createAdminClient(), studentId);
    if (!data) return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return serverError('data/student', err, 'Could not load your portal.');
  }
}
