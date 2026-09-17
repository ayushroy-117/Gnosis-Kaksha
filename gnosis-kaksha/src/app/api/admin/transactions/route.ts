import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET  /api/admin/transactions  — list all transactions
// POST /api/admin/transactions  — record a manual fee payment

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const studentId = searchParams.get('student_id');

    let query = supabase
      .from('transactions')
      .select('*, students(full_name, registration_number, class_number)')
      .order('date', { ascending: false });

    if (status) query = query.eq('status', status);
    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });

    return NextResponse.json({ transactions: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return NextResponse.json({ error: 'DB not configured' }, { status: 503 });

    const body = await request.json();
    const { studentId, amount, method, description, utr } = body;

    if (!studentId || !amount || !method) {
      return NextResponse.json(
        { error: 'studentId, amount, and method are required' },
        { status: 400 }
      );
    }

    // Fetch student to confirm they exist
    const { data: student } = await supabase
      .from('students')
      .select('id, full_name, tuition_after_scholarship')
      .eq('id', studentId)
      .single();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Insert transaction
    const { data: txn, error: txnError } = await supabase
      .from('transactions')
      .insert([
        {
          id: `RCPT-${Date.now()}`,
          student_id: studentId,
          student_name: student.full_name,
          description: description || `Monthly tuition — ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`,
          amount: Number(amount),
          method,
          utr: utr?.trim() || null,
          status: 'verified',
          date: today,
        },
      ])
      .select()
      .single();

    if (txnError) return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 });

    // Mark student fee as paid
    await supabase
      .from('students')
      .update({ fee_state: 'paid', amount_due: 0, updated_at: new Date().toISOString() })
      .eq('id', studentId);

    return NextResponse.json({ success: true, transaction: txn }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
