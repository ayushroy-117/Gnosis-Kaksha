import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, serverError } from '@/lib/authz';
import { hasPermission } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { distanceMetres } from '@/lib/geo';
import { logActivity, todayIST, UUID } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapRow = (r: any) => ({
  id: r.id,
  userId: r.user_id,
  date: r.date,
  checkInAt: r.check_in_at,
  checkInDistance: r.check_in_distance_m,
  checkOutAt: r.check_out_at,
  checkOutDistance: r.check_out_distance_m,
  method: r.method,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// GET /api/staff-attendance?month=YYYY-MM[&userId=] — own check-ins for a month (reports
// managers may pass userId), plus the branch location the check-in is measured against.
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  if (user.role === 'student') return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
  const sp = request.nextUrl.searchParams;
  const month = /^\d{4}-\d{2}$/.test(sp.get('month') ?? '') ? sp.get('month')! : todayIST().slice(0, 7);
  const other = sp.get('userId');
  if (other && (!UUID.test(other) || !hasPermission(user.role, 'view_staff_reports'))) {
    return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
  }
  try {
    const db = createAdminClient();
    const [y, m] = month.split('-').map(Number);
    const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    const [{ data, error }, branch] = await Promise.all([
      db.from('staff_attendance').select('*').eq('user_id', other ?? user.id).gte('date', `${month}-01`).lte('date', end).order('date', { ascending: false }),
      user.branchId
        ? db.from('branches').select('name, latitude, longitude, radius_m').eq('id', user.branchId).maybeSingle().then((r) => r.data)
        : Promise.resolve(null),
    ]);
    if (error) throw error;
    return NextResponse.json({
      month,
      today: todayIST(),
      records: (data ?? []).map(mapRow),
      branch: branch
        ? { name: branch.name, located: branch.latitude != null && branch.longitude != null, radius: branch.radius_m }
        : null,
    });
  } catch (err) {
    return serverError('staff-attendance GET', err, 'Could not load attendance.');
  }
}

const schema = z.object({
  action: z.enum(['in', 'out']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000).optional(),
});

// POST /api/staff-attendance { action: 'in' | 'out', latitude, longitude } — check in / out
// for today. Only allowed within the branch's radius.
// ponytail: trusts the phone's GPS reading, so a location-spoofing app passes. Pair with the
// biometric device (or a QR code at the front desk) if that ever matters.
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  if (user.role === 'student') return NextResponse.json({ error: 'You do not have permission to do that.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Your location could not be read. Allow location access and try again.' }, { status: 400 });
  const { action, latitude, longitude, accuracy } = parsed.data;
  if (!user.branchId) return NextResponse.json({ error: 'Your account has no branch. Ask the admin to set it.' }, { status: 400 });

  try {
    const db = createAdminClient();
    const { data: branch } = await db.from('branches').select('name, latitude, longitude, radius_m').eq('id', user.branchId).maybeSingle();
    if (!branch || branch.latitude == null || branch.longitude == null) {
      return NextResponse.json({ error: `The location of ${branch?.name ?? 'your branch'} is not set yet. Ask the admin to set it under Branches.` }, { status: 400 });
    }
    const distance = Math.round(distanceMetres(latitude, longitude, branch.latitude, branch.longitude));
    if (distance > branch.radius_m) {
      return NextResponse.json(
        { error: `You are about ${distance} m from ${branch.name}. Attendance can only be marked within ${branch.radius_m} m of the branch.${accuracy && accuracy > 100 ? ' Your GPS signal is weak; step outside or turn on precise location.' : ''}` },
        { status: 403 }
      );
    }

    const today = todayIST();
    const { data: existing } = await db.from('staff_attendance').select('*').eq('user_id', user.id).eq('date', today).maybeSingle();
    if (action === 'in') {
      if (existing) return NextResponse.json({ error: 'You have already checked in today.' }, { status: 409 });
      const { data, error } = await db
        .from('staff_attendance')
        .insert({ user_id: user.id, date: today, branch_id: user.branchId, check_in_distance_m: distance })
        .select('*')
        .single();
      if (error) throw error;
      await logActivity(db, user, 'Checked in', `${branch.name}, ${distance} m from branch`);
      return NextResponse.json({ success: true, record: mapRow(data) });
    }
    if (!existing) return NextResponse.json({ error: 'Check in first.' }, { status: 400 });
    if (existing.check_out_at) return NextResponse.json({ error: 'You have already checked out today.' }, { status: 409 });
    const { data, error } = await db
      .from('staff_attendance')
      .update({ check_out_at: new Date().toISOString(), check_out_distance_m: distance })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    await logActivity(db, user, 'Checked out', `${branch.name}, ${distance} m from branch`);
    return NextResponse.json({ success: true, record: mapRow(data) });
  } catch (err) {
    return serverError('staff-attendance POST', err, 'Could not mark attendance.');
  }
}
