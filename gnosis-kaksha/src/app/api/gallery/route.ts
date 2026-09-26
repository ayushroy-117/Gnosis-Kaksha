import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/gallery — returns gallery images, optionally limited
// Query params:
//   ?limit=8    — return only N images (e.g. for homepage preview)
//   ?tag=Batch  — filter by event_tag
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '0') || 0, 0), 100);
    const tag = searchParams.get('tag');

    const supabase = createAdminClient();

    let query = supabase
      .from('gallery_images')
      .select('*')
      .order('display_order', { ascending: true });

    if (tag) {
      query = query.eq('event_tag', tag);
    }

    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase gallery fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch gallery images' }, { status: 500 });
    }

    return NextResponse.json({ images: data || [] });
  } catch (error) {
    console.error('Gallery API error:', error);
    return NextResponse.json({ error: 'Could not load the gallery.' }, { status: 500 });
  }
}
