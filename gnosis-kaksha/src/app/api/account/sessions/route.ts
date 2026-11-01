import { NextResponse } from 'next/server';
import { getSessionUser, serverError } from '@/lib/authz';
import { createSessionClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logActivity } from '@/lib/server/portal';

export const dynamic = 'force-dynamic';

// DELETE /api/account/sessions — sign this account out on every device (including this one).
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 });
  try {
    if (user.role !== 'student') await logActivity(createAdminClient(), user, 'Signed out of all devices');
    const supabase = await createSessionClient();
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError('account/sessions DELETE', err, 'Could not sign out of other devices.');
  }
}
