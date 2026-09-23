import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAllNotices, addNotice, deleteNotice } from '@/lib/institute-store';

// GET  /api/admin/notices    — list all notices
// POST /api/admin/notices    — create a new notice with optional file attachment
// DELETE /api/admin/notices?id=<uuid> — delete a notice

export async function GET() {
  try {
    const supabase = createAdminClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map((n: any) => ({
          id: n.id,
          title: n.title,
          content: n.content || '',
          date: n.published_at ? n.published_at.split('T')[0] : (n.created_at ? n.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
          audience: n.audience || 'All',
          pinned: Boolean(n.is_pinned),
          attachmentUrl: n.external_url || null,
          attachmentName: n.external_url ? n.external_url.split('/').pop()?.split('?')[0] || 'Attachment' : null,
          attachmentSize: null,
        }));
        return NextResponse.json({ notices: mapped });
      }
    }

    // Local / fallback store
    return NextResponse.json({ notices: getAllNotices() });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message, notices: getAllNotices() }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, external_url, audience, pinned, is_pinned, attachmentUrl, attachmentName, attachmentSize } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Notice title is required' }, { status: 400 });
    }

    const finalAttachmentUrl = attachmentUrl || external_url || null;
    const finalPinned = Boolean(is_pinned ?? pinned);

    // Save in local store first for instant UI response and persistence
    const newNotice = addNotice({
      title: title.trim(),
      content: content?.trim() || '',
      audience: audience || 'All',
      pinned: finalPinned,
      attachmentUrl: finalAttachmentUrl,
      attachmentName: attachmentName || (finalAttachmentUrl ? 'Attached Document' : null),
      attachmentSize: attachmentSize || null,
    });

    // Also sync to Supabase if available
    try {
      const supabase = createAdminClient();
      if (supabase) {
        await supabase
          .from('notices')
          .insert([
            {
              id: newNotice.id.startsWith('not-') ? undefined : newNotice.id,
              title: title.trim(),
              content: content?.trim() || null,
              external_url: finalAttachmentUrl,
              audience: audience || 'All',
              is_pinned: finalPinned,
              is_active: true,
            },
          ]);
      }
    } catch (e) {
      console.warn('Notice Supabase sync warning (ignorable in offline mode):', e);
    }

    return NextResponse.json({ success: true, notice: newNotice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Notice ID is required' }, { status: 400 });

    try {
      const supabase = createAdminClient();
      if (supabase) {
        await supabase.from('notices').delete().eq('id', id);
      }
    } catch (e) {
      console.warn('Notice Supabase delete warning:', e);
    }

    deleteNotice(id);
    return NextResponse.json({ success: true, message: 'Notice deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
