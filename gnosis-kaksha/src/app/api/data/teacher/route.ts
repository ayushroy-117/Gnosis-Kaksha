import { NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildTeacherData } from '@/lib/server/institute';

export const dynamic = 'force-dynamic';

// GET /api/data/teacher — active roster WITHOUT fee/scholarship data, plus allocations.
// Teachers only get the students/requests for the subjects+classes assigned to them.
export async function GET() {
  const auth = await requirePermission('view_student_roster');
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await buildTeacherData(createAdminClient(), auth.user));
  } catch (err) {
    return serverError('data/teacher', err, 'Could not load class data.');
  }
}
