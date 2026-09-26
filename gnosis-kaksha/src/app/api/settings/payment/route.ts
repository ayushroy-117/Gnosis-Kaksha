import { NextResponse } from 'next/server';
import { serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPaymentSettings } from '@/lib/server/settings';

export const dynamic = 'force-dynamic';

// GET /api/settings/payment — public: the UPI payee every payment QR is built
// from (it is printed on the QR anyway, so not secret).
export async function GET() {
  try {
    const { upiId, payeeName, extraParams } = await getPaymentSettings(createAdminClient());
    return NextResponse.json({ upiId, payeeName, extraParams });
  } catch (err) {
    return serverError('settings/payment GET', err, 'Could not load payment details.');
  }
}
