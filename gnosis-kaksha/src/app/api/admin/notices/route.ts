import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { getNotices, mapNotice, noticeAudiencesFor } from '@/lib/server/institute';

export const dynamic = 'force-dynamic';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

// GET /api/admin/notices — every active notice incl. staff-only (admin)
export async function GET() {
  const auth = await requirePermission('manage_notices');
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ notices: await getNotices(createAdminClient(), noticeAudiencesFor('staff')) });
  } catch (err) {
    return serverError('admin/notices GET', err, 'Could not load notices.');
  }
}

const noticeSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200),
  content: z.string().trim().max(5000).optional().default(''),
  audience: z.enum(['All', 'Students', 'Parents', 'Staff']).default('All'),
  pinned: z.boolean().optional().default(false),
  attachmentUrl: z.string().max(8_000_000).nullable().optional(),
  attachmentName: z.string().trim().max(200).nullable().optional(),
  attachmentSize: z.string().trim().max(40).nullable().optional(),
});

// POST /api/admin/notices — publish a notice, optionally with a file (data: URL) or link.
export async function POST(request: NextRequest) {
  const auth = await requirePermission('manage_notices');
  if (!auth.ok) return auth.response;

  const parsed = noticeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid notice' }, { status: 400 });
  }
  const n = parsed.data;
  const url = n.attachmentUrl?.trim() || null;
  if (url) {
    if (url.startsWith('data:')) {
      const base64 = url.slice(url.indexOf(',') + 1);
      if ((base64.length * 3) / 4 > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json({ error: 'Attachment is larger than 5 MB. Upload a smaller file or share a link.' }, { status: 413 });
      }
    } else if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'Links must start with http:// or https://' }, { status: 400 });
    }
  }

  try {
    const { data, error } = await createAdminClient()
      .from('notices')
      .insert({
        title: n.title,
        content: n.content || null,
        audience: n.audience,
        is_pinned: n.pinned,
        is_active: true,
        external_url: url,
        attachment_name: url ? n.attachmentName || (url.startsWith('data:') ? 'Attached Document' : 'Open link') : null,
        attachment_size: url ? n.attachmentSize || null : null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, notice: mapNotice(data) }, { status: 201 });
  } catch (err) {
    return serverError('admin/notices POST', err, 'Could not publish the notice.');
  }
}

// DELETE /api/admin/notices?id=<uuid> — removes a notice.
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission('manage_notices');
  if (!auth.ok) return auth.response;
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'A valid notice id is required.' }, { status: 400 });
  }
  try {
    const { data, error } = await createAdminClient().from('notices').delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: 'Notice not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('admin/notices DELETE', err, 'Could not delete the notice.');
  }
}
