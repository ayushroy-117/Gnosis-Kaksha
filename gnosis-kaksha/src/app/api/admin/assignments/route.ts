import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAssignments } from '@/lib/server/institute';
import { SUBJECT_FEES } from '@/lib/fees';

const bodySchema = z.object({
  teacherId: z.string().uuid(),
  assignments: z
    .array(z.object({ subject: z.string().trim().min(1), classNumber: z.coerce.number().int().min(1).max(12) }))
    .max(200),
});

// PUT /api/admin/assignments — replace the full set of subjects+classes a teacher teaches (admin).
export async function PUT(request: NextRequest) {
  const auth = await requirePermission('manage_accounts');
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid assignments' }, { status: 400 });
  }
  const { teacherId } = parsed.data;

  // De-duplicate and check every subject is offered for that class.
  const seen = new Set<string>();
  const rows: Array<{ teacher_id: string; subject: string; class_number: number }> = [];
  for (const a of parsed.data.assignments) {
    const offered = Object.keys(SUBJECT_FEES[a.classNumber] ?? {});
    const subject = offered.find((s) => s.toLowerCase() === a.subject.toLowerCase());
    if (!subject) {
      return NextResponse.json({ error: `${a.subject} is not offered for Class ${a.classNumber}.` }, { status: 400 });
    }
    const key = `${a.classNumber}:${subject}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ teacher_id: teacherId, subject, class_number: a.classNumber });
  }

  try {
    const db = createAdminClient();
    const { data: target } = await db.from('profiles').select('role').eq('id', teacherId).maybeSingle();
    if (!target) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    if (target.role !== 'teacher') {
      return NextResponse.json({ error: 'Subjects can only be assigned to teacher accounts.' }, { status: 400 });
    }

    const { error: delErr } = await db.from('teacher_assignments').delete().eq('teacher_id', teacherId);
    if (delErr) throw delErr;
    if (rows.length) {
      const { error } = await db.from('teacher_assignments').insert(rows);
      if (error) throw error;
    }
    return NextResponse.json({ success: true, assignments: await getAssignments(db, teacherId) });
  } catch (err) {
    return serverError('admin/assignments PUT', err, 'Could not save the subject assignments.');
  }
}
