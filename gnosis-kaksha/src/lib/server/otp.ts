import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Stateless mobile OTP: the code is an HMAC of (phone, 5-minute window), so no
 * table is needed. A verified phone gets a signed proof token the admission
 * route checks.
 *
 * Delivery is pluggable via deliverOtp(). Until a provider is wired, OTP is
 * enforced only outside production and the code is returned to the caller
 * (dev/test) — set OTP_PROVIDER to turn enforcement on in production.
 */
const WINDOW_MS = 5 * 60_000;
const PROOF_TTL_MS = 30 * 60_000;

const secret = () => {
  const s = process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('OTP_SECRET / SUPABASE_SERVICE_ROLE_KEY is not set');
  return s;
};

const hmac = (data: string) => createHmac('sha256', secret()).update(data).digest('hex');

/** Last 10 digits, so "+91 98765 43210" and "9876543210" are the same phone. */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').slice(-10);
}

export function otpProvider(): string | null {
  return process.env.OTP_PROVIDER || null;
}

/** True when the admission form must carry a verified-phone proof. */
export function otpRequired(): boolean {
  return Boolean(otpProvider()) || process.env.NODE_ENV !== 'production';
}

function codeFor(phone: string, window: number): string {
  return (parseInt(hmac(`otp:${phone}:${window}`).slice(0, 8), 16) % 1_000_000).toString().padStart(6, '0');
}

export function generateOtp(rawPhone: string): string {
  return codeFor(normalizePhone(rawPhone), Math.floor(Date.now() / WINDOW_MS));
}

function safeEq(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkOtp(rawPhone: string, code: string): boolean {
  const phone = normalizePhone(rawPhone);
  const w = Math.floor(Date.now() / WINDOW_MS);
  return [w, w - 1].some((win) => safeEq(codeFor(phone, win), code.trim()));
}

/** Send the code. Mock provider just logs; plug WhatsApp/SMS in here. */
export async function deliverOtp(rawPhone: string, code: string): Promise<void> {
  const provider = otpProvider();
  if (!provider) {
    console.info(`[otp] (mock) code for ${normalizePhone(rawPhone)}: ${code}`);
    return;
  }
  // ponytail: no real provider wired yet; add a branch per provider (whatsapp, sms) here.
  throw new Error(`OTP provider "${provider}" is not implemented`);
}

export function issueProof(rawPhone: string): string {
  const body = `${normalizePhone(rawPhone)}.${Date.now() + PROOF_TTL_MS}`;
  return `${body}.${hmac(`proof:${body}`)}`;
}

export function verifyProof(rawPhone: string, token: unknown): boolean {
  if (typeof token !== 'string') return false;
  const [phone, exp, sig] = token.split('.');
  if (!phone || !exp || !sig) return false;
  if (phone !== normalizePhone(rawPhone) || Number(exp) < Date.now()) return false;
  return safeEq(hmac(`proof:${phone}.${exp}`), sig);
}
