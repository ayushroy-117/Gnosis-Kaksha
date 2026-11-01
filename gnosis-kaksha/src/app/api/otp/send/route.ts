import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { deliverOtp, generateOtp, normalizePhone, otpProvider, otpRequired } from '@/lib/server/otp';

export const dynamic = 'force-dynamic';

const phoneSchema = z.object({ phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number') });

// GET /api/otp/send — does the admission form need to verify the mobile number?
export async function GET() {
  return NextResponse.json({ required: otpRequired() });
}

// POST /api/otp/send — text/WhatsApp a 6-digit code to the applicant's mobile.
export async function POST(request: NextRequest) {
  const parsed = phoneSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const phone = normalizePhone(parsed.data.phone);

  if (!rateLimit(`otp-send:${phone}`, 3, 10 * 60_000) || !rateLimit(`otp-send-ip:${clientIp(request.headers)}`, 15, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many codes requested. Please wait a few minutes.' }, { status: 429 });
  }
  try {
    const code = generateOtp(phone);
    await deliverOtp(phone, code);
    // Mock mode (no provider, not production): hand the code back so dev/tests can proceed.
    const devCode = !otpProvider() && process.env.NODE_ENV !== 'production' ? code : undefined;
    return NextResponse.json({ success: true, devCode });
  } catch (err) {
    console.error('[otp/send]', err);
    return NextResponse.json({ error: 'Could not send the code. Please try again.' }, { status: 502 });
  }
}
