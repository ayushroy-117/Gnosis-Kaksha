'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { approveStudent, rejectStudent } from '@/lib/institute-store';

// Pages whose numbers depend on the roster; refresh them all after a change.
const AFFECTED_PATHS = [
  '/admin/admissions',
  '/admin/dashboard',
  '/admin/students',
  '/accountant/dashboard',
  '/accountant/collections',
  '/accountant/transactions',
  '/accountant/reports',
];

type ActionResult = { ok: boolean; error?: string };

async function setStatus(
  id: string,
  status: 'active' | 'rejected'
): Promise<ActionResult> {
  try {
    // 1. Update local persistent store
    if (status === 'active') {
      approveStudent(id);
    } else {
      rejectStudent(id);
    }

    // 2. If Supabase admin client is configured, also update Supabase
    const supabase = createAdminClient();
    if (supabase) {
      try {
        await supabase
          .from('students')
          .update({ status })
          .eq('id', id);
      } catch (sbErr) {
        console.warn('Supabase sync warning:', sbErr);
      }
    }

    for (const path of AFFECTED_PATHS) {
      revalidatePath(path);
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    };
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
