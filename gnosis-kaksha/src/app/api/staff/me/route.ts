import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { bankSchema, ensureStaffDetails, loadStaffProfile, saveStaffDetails, selfProfileSchema } from '@/lib/server/staff';
import { logActivity } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

async function staffUser() {
  const user = await getSessionUser();
  if (!user) return { response: NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 }) };
  if (user.role === 'student') return { response: NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 }) };
  return { user };
}

// GET /api/staff/me — the signed-in staff member's own profile, plus their recent activity.
export async function GET() {
  const { user, response } = await staffUser();
  if (!user) return response;
  try {
    const db = createAdminClient();
    await ensureStaffDetails(db, user.id, user.role);
    const [profile, { data: activity, error }] = await Promise.all([
      loadStaffProfile(db, user.id),
      db.from('activity_log').select('action, detail, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
    ]);
    if (error) throw error;
    return NextResponse.json({
      profile,
      activity: (activity ?? []).map((a) => ({ action: a.action, detail: a.detail, at: a.created_at })),
    });
  } catch (err) {
    return serverError('staff/me GET', err, 'Could not load your profile.');
  }
}

// PATCH /api/staff/me — the staff member edits their own personal/professional and bank details.
// Fields printed on the ID card (name, phone, address, father's name, department) stay with the admin.
export async function PATCH(request: NextRequest) {
  const { user, response } = await staffUser();
  if (!user) return response;
  const body = await request.json().catch(() => null);
  const parsed = selfProfileSchema.merge(bankSchema).strict().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid details' }, { status: 400 });
  }
  try {
    const db = createAdminClient();
    await saveStaffDetails(db, user.id, user.role, parsed.data);
    await logActivity(db, user, 'Profile updated', Object.keys(parsed.data).join(', '));
    return NextResponse.json({ success: true, profile: await loadStaffProfile(db, user.id) });
  } catch (err) {
    return serverError('staff/me PATCH', err, 'Could not save your profile.');
  }
}
