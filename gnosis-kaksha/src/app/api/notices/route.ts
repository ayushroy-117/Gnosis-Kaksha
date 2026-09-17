import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/notices — returns active notices, pinned first
// Query params:
//   ?audience=Students   — filter by audience ('All', 'Students', 'Parents', 'Staff')
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const audience = searchParams.get('audience');

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    let query = supabase
      .from('notices')
      .select('*')
      .eq('is_active', true)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false });

    // Filter by audience if specified (always include 'All' notices)
    if (audience && audience !== 'All') {
      query = query.in('audience', ['All', audience]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase notices fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch notices' }, { status: 500 });
    }

    return NextResponse.json({ notices: data || [] });
  } catch (error: any) {
    console.error('Notices API error:', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
