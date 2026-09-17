import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET  /api/admin/notices    — list all notices
// POST /api/admin/notices    — create a new notice
// DELETE /api/admin/notices?id=<uuid> — delete a notice

export async function GET() {
  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Failed to fetch notices' }, { status: 500 });

    return NextResponse.json({ notices: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const body = await request.json();
    const { title, content, external_url, audience, is_pinned } = body;

    if (!title) {
      return NextResponse.json({ error: 'Notice title is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notices')
      .insert([
        {
          title: title.trim(),
          content: content?.trim() || null,
          external_url: external_url?.trim() || null,
          audience: audience || 'All',
          is_pinned: Boolean(is_pinned),
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Failed to create notice' }, { status: 500 });

    return NextResponse.json({ success: true, notice: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Notice ID is required' }, { status: 400 });

    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) return NextResponse.json({ error: 'Failed to delete notice' }, { status: 500 });

    return NextResponse.json({ success: true, message: 'Notice deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
