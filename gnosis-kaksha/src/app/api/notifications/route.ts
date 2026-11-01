import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET /api/notifications — the signed-in user's latest notifications and unread count.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  try {
    const db = createAdminClient();
    const [{ data, error }, { count, error: cErr }] = await Promise.all([
      db.from('notifications').select('id, title, body, link, read_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
    ]);
    if (error) throw error;
    if (cErr) throw cErr;
    return NextResponse.json({
      unread: count ?? 0,
      notifications: (data ?? []).map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, read: !!n.read_at, at: n.created_at })),
    });
  } catch (err) {
    return serverError('notifications GET', err, 'Could not load notifications.');
  }
}

// POST /api/notifications { ids?: uuid[] } — mark some (or, without ids, all) as read.
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  const parsed = z.object({ ids: z.array(z.string().uuid()).max(100).optional() }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  try {
    let q = createAdminClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
    if (parsed.data.ids?.length) q = q.in('id', parsed.data.ids);
    const { error } = await q;
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('notifications POST', err, 'Could not update notifications.');
  }
}
