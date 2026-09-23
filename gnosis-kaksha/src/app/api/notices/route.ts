import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAllNotices } from '@/lib/institute-store';

// GET /api/notices — returns active notices, pinned first
// Query params:
//   ?audience=Students   — filter by audience ('All', 'Students', 'Parents', 'Staff')
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get('audience');

    const supabase = createAdminClient();
    if (supabase) {
      let query = supabase
        .from('notices')
        .select('*')
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false });

      if (audience && audience !== 'All') {
        query = query.in('audience', ['All', audience]);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return NextResponse.json({
          notices: data.map((n: any) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            published_at: n.published_at || n.created_at || new Date().toISOString(),
            is_pinned: Boolean(n.is_pinned),
            audience: n.audience,
            external_url: n.external_url || null,
          })),
        });
      }
    }

    // Local / fallback store
    let local = getAllNotices();
    if (audience && audience !== 'All') {
      local = local.filter((n) => n.audience === 'All' || n.audience === audience);
    }

    return NextResponse.json({
      notices: local.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        published_at: n.date,
        is_pinned: n.pinned,
        audience: n.audience,
        external_url: n.attachmentUrl || null,
        attachmentName: n.attachmentName || null,
        attachmentSize: n.attachmentSize || null,
      })),
    });
  } catch (error: any) {
    console.error('Notices API error:', error);
    return NextResponse.json({
      notices: getAllNotices().map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        published_at: n.date,
        is_pinned: n.pinned,
        audience: n.audience,
        external_url: n.attachmentUrl || null,
        attachmentName: n.attachmentName || null,
        attachmentSize: n.attachmentSize || null,
      })),
    });
  }
}
