import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission, serverError } from '@/lib/authz';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPaymentSettings } from '@/lib/server/settings';
import { VPA_PATTERN } from '@/lib/upi';

export const dynamic = 'force-dynamic';

// GET /api/admin/settings/payment — current payee incl. who changed it and when (admin).
export async function GET() {
  const auth = await requirePermission('manage_payment_settings');
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json(await getPaymentSettings(createAdminClient()));
  } catch (err) {
    return serverError('admin/settings/payment GET', err, 'Could not load payment settings.');
  }
}

const bodySchema = z.object({
  upiId: z.string().trim().regex(VPA_PATTERN, 'That is not a valid UPI ID (it should look like name@bank).'),
  payeeName: z.string().trim().min(2, 'Enter the payee name shown in UPI apps').max(60),
  extraParams: z
    .record(z.string().regex(/^[a-z0-9]{1,20}$/), z.string().max(100))
    .refine((o) => Object.keys(o).length <= 10, 'Too many QR parameters')
    .default({}),
});

// PUT /api/admin/settings/payment — set the UPI payee (from an uploaded QR or typed in).
export async function PUT(request: NextRequest) {
  const auth = await requirePermission('manage_payment_settings');
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid payment settings' }, { status: 400 });
  }
  try {
    const db = createAdminClient();
    const { error } = await db.from('app_settings').upsert({
      key: 'upi_payee',
      value: parsed.data,
      updated_at: new Date().toISOString(),
      updated_by: `${auth.user.fullName} (${auth.user.email})`,
    });
    if (error) throw error;
    return NextResponse.json({ success: true, settings: await getPaymentSettings(db) });
  } catch (err) {
    return serverError('admin/settings/payment PUT', err, 'Could not save payment settings.');
  }
}
