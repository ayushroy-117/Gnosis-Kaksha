import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, serverError } from '@/lib/authz';
import { hasPermission } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { fileResponse, UUID } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

// GET /api/leaves/<id>/document — the supporting document: the applicant, the admin, or reports viewers.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  try {
    const { data, error } = await createAdminClient().from('leave_requests').select('user_id, document, document_mime, document_name').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data?.document) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    if (data.user_id !== user.id && !hasPermission(user.role, 'decide_leave') && !hasPermission(user.role, 'view_staff_reports')) {
      return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
    }
    return fileResponse(data.document, data.document_mime, data.document_name ?? 'document');
  } catch (err) {
    return serverError('leave document GET', err, 'Could not load the document.');
  }
}
