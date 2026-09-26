'use server';

import { revalidatePath } from 'next/cache';
import { authorizeAction } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';

type ActionResult = { ok: boolean; error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function setStatus(id: string, status: 'active' | 'rejected'): Promise<ActionResult> {
  const auth = await authorizeAction('manage_admissions');
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!UUID.test(id)) return { ok: false, error: 'Invalid student id.' };

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('students')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id');
    if (error) throw error;
    if (!data?.length) return { ok: false, error: 'This application was already decided. Refresh the page.' };

    if (status === 'rejected') {
      // Close any admission payment still waiting for review.
      await db
        .from('transactions')
        .update({
          status: 'rejected',
          rejected_note: 'Admission application rejected',
          verified_by: `${auth.user.fullName} (admin)`,
          verified_at: new Date().toISOString().slice(0, 10),
        })
        .eq('student_id', id)
        .eq('status', 'pending');
    }

    revalidatePath('/admin', 'layout');
    return { ok: true };
  } catch (err) {
    console.error('[admissions action]', err);
    return { ok: false, error: 'Could not update the application. Please try again.' };
  }
}

/** Approve a pending admission: flips the student to `active`. */
export async function approveAdmission(id: string): Promise<ActionResult> {
  return setStatus(id, 'active');
}

/** Reject a pending admission: flips the student to `rejected`. */
export async function rejectAdmission(id: string): Promise<ActionResult> {
  return setStatus(id, 'rejected');
}
