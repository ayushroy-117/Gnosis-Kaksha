import { NextResponse } from 'next/server';
import { serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { getBranches } from '@/lib/server/institute';

export const dynamic = 'force-dynamic';

// GET /api/branches — public: active branches (admission form, staff forms).
export async function GET() {
  try {
    const branches = await getBranches(createAdminClient(), { activeOnly: true });
    return NextResponse.json({ branches: branches.map(({ id, name, address }) => ({ id, name, address })) });
  } catch (err) {
    return serverError('branches GET', err, 'Could not load branches.');
  }
}
