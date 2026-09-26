import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/authz';
import { getPermissions } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET /api/auth/me — the signed-in user (or null) and their permissions.
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user, permissions: user ? getPermissions(user.role) : [] });
}
