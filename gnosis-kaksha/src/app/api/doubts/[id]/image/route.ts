import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, serverError } from '@/lib/authz';
import { hasPermission } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { teacherScopeFor } from '@/lib/server/institute';
import { canTeach } from '@/lib/institute-data';
import { fileResponse, UUID } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

// GET /api/doubts/<id>/image — the photo attached to a doubt: the student who asked,
// teachers of that subject at that branch, or the admin.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  try {
    const db = createAdminClient();
    const { data: d, error } = await db.from('doubts').select('student_id, branch_id, subject, class_number, image, image_mime').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!d?.image) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    const allowed =
      user.role === 'admin' ||
      (user.role === 'student' && user.studentId === d.student_id) ||
      (hasPermission(user.role, 'answer_doubts') && user.branchId === d.branch_id && canTeach(await teacherScopeFor(db, user), d.subject, d.class_number));
    if (!allowed) return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
    return fileResponse(d.image, d.image_mime, `doubt-${id.slice(0, 8)}.${d.image_mime.split('/')[1]}`);
  } catch (err) {
    return serverError('doubt image GET', err, 'Could not load the image.');
  }
}
