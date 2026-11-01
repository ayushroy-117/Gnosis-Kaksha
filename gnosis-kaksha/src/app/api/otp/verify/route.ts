import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { checkOtp, issueProof, normalizePhone } from '@/lib/server/otp';

export const dynamic = 'force-dynamic';

const schema = z.object({
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

// POST /api/otp/verify — exchange a correct code for a proof token the admission form submits.
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const phone = normalizePhone(parsed.data.phone);

  if (!rateLimit(`otp-verify:${phone}:${clientIp(request.headers)}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts. Request a new code in a few minutes.' }, { status: 429 });
  }
  if (!checkOtp(phone, parsed.data.code)) {
    return NextResponse.json({ error: 'That code is incorrect or has expired.' }, { status: 400 });
  }
  return NextResponse.json({ success: true, proof: issueProof(phone) });
}
