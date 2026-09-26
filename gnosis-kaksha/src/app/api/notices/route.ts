import { NextResponse } from 'next/server';
import { serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { getNotices, noticeAudiencesFor } from '@/lib/server/institute';

export const dynamic = 'force-dynamic';

// GET /api/notices — public notice board (pinned first). Staff-only notices excluded.
export async function GET() {
  try {
    const notices = await getNotices(createAdminClient(), noticeAudiencesFor('public'));
    return NextResponse.json({
      notices: notices.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        published_at: n.date,
        is_pinned: n.pinned,
        audience: n.audience,
        external_url: n.attachmentUrl,
        attachmentName: n.attachmentName,
        attachmentSize: n.attachmentSize,
      })),
    });
  } catch (err) {
    return serverError('notices GET', err, 'Could not load notices.');
  }
}
