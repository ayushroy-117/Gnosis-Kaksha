import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET  /api/admin/students           — list all students with optional filters
// PATCH /api/admin/students          — update student status (approve/reject)
//
// Query params for GET:
//   ?status=pending|active|rejected
//   ?class=10
//   ?q=search term (name, reg number, email)

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const classNum = searchParams.get('class');
    const q = searchParams.get('q');

    let query = supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (classNum) query = query.eq('class_number', parseInt(classNum));
    if (q) {
      query = query.or(
        `full_name.ilike.%${q}%,registration_number.ilike.%${q}%,email.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });

    return NextResponse.json({ students: data || [], total: data?.length || 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    if (!['pending', 'active', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be pending, active, or rejected' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('students')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, registration_number, full_name, status')
      .single();

    if (error) return NextResponse.json({ error: 'Failed to update student status' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

    return NextResponse.json({ success: true, student: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
