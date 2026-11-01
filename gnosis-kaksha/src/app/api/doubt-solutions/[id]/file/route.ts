import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { fileResponse, UUID } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

// GET /api/doubt-solutions/<id>/file — students of that class at that branch, and staff.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  try {
    const db = createAdminClient();
    const { data: s, error } = await db.from('doubt_solutions').select('branch_id, class_number, file, file_mime, file_name').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!s?.file) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    if (user.role === 'student') {
      if (!user.studentId) return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
      const { data: st } = await db.from('students').select('branch_id, class_number').eq('id', user.studentId).maybeSingle();
      if (!st || st.branch_id !== s.branch_id || st.class_number !== s.class_number) {
        return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
      }
    }
    return fileResponse(s.file, s.file_mime, s.file_name ?? 'solution');
  } catch (err) {
    return serverError('doubt solution file GET', err, 'Could not load the file.');
  }
}
