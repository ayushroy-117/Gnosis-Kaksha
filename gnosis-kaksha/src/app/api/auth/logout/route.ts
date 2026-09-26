import { NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';

// POST /api/auth/logout — clears the session cookie.
export async function POST() {
  try {
    const supabase = await createSessionClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('[auth/logout]', err);
  }
  return NextResponse.json({ success: true });
}
