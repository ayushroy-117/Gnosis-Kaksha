import { NextResponse } from 'next/server';
import { getSessionUser, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureStaffDetails, loadStaffProfile } from '@/lib/server/staff';

export const dynamic = 'force-dynamic';

// GET /api/staff/me — the signed-in staff member's own profile (for their ID card).
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  if (user.role === 'student') return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
  try {
    const db = createAdminClient();
    await ensureStaffDetails(db, user.id, user.role);
    const profile = await loadStaffProfile(db, user.id);
    return NextResponse.json({ profile });
  } catch (err) {
    return serverError('staff/me GET', err, 'Could not load your profile.');
  }
}
