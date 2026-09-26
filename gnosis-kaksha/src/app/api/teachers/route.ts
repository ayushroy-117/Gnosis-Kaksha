import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/teachers — returns all active teachers ordered by display_order
export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Supabase teachers fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
    }

    return NextResponse.json({ teachers: data || [] });
  } catch (error) {
    console.error('Teachers API error:', error);
    return NextResponse.json({ error: 'Could not load teachers.' }, { status: 500 });
  }
}
