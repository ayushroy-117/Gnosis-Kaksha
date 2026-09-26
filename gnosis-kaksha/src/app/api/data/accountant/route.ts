import { NextResponse } from 'next/server';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildAccountantData } from '@/lib/server/institute';

export const dynamic = 'force-dynamic';

// GET /api/data/accountant — roster with fees, full ledger, pending queue.
export async function GET() {
  const auth = await requirePermission('view_financials');
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await buildAccountantData(createAdminClient(), auth.user));
  } catch (err) {
    return serverError('data/accountant', err, 'Could not load financial data.');
  }
}
