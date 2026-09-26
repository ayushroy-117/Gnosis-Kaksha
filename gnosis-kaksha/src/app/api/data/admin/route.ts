import { NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildAdminData } from '@/lib/server/institute';

export const dynamic = 'force-dynamic';

// GET /api/data/admin — admin overview (roster, admissions, notices, counts).
export async function GET() {
  const auth = await requirePermission('manage_admissions');
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await buildAdminData(createAdminClient()));
  } catch (err) {
    return serverError('data/admin', err, 'Could not load admin data.');
  }
}
