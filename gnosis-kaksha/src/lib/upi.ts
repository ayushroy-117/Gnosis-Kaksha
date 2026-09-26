/**
 * UPI payee settings and payment links. The payee (VPA + name) is set by the
 * admin by uploading the institute's QR code (Admin → Payment Settings) and is
 * served by GET /api/settings/payment; NEXT_PUBLIC_UPI_ID is only the fallback
 * until that has been done.
 */

export interface UpiPayee {
  /** VPA, e.g. gnosiskaksha@okaxis */
  upiId: string;
  payeeName: string;
  /**
   * Extra parameters from the uploaded merchant QR that must be kept (e.g. mc,
   * the merchant category code). Amount/note/reference are always ours.
   */
  extraParams: Record<string, string>;
}

export const DEFAULT_PAYEE: UpiPayee = {
  upiId: process.env.NEXT_PUBLIC_UPI_ID || 'gnosiskaksha@upi',
  payeeName: 'Gnosis Kaksha',
  extraParams: {},
};

/** name@handle — letters, digits, dot, dash, underscore; handle letters only. */
export const VPA_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

// Params we set per payment, or that a static QR's signature would no longer
// match once we change the amount — never copied from the uploaded QR.
const PER_PAYMENT_PARAMS = new Set(['am', 'tn', 'tr', 'tid', 'cu', 'sign', 'mam', 'orgid', 'url', 'pa', 'pn']);

/**
 * Parse the text inside a UPI QR code (upi://pay?pa=...&pn=...).
 * Returns null if it isn't a UPI payment QR with a valid VPA.
 */
export function parseUpiQr(text: string): UpiPayee | null {
  const raw = text.trim();
  if (!/^upi:\/\/pay\?/i.test(raw)) return null;
  const params = new URLSearchParams(raw.slice(raw.indexOf('?') + 1));
  const pa = params.get('pa')?.trim() ?? '';
  if (!VPA_PATTERN.test(pa)) return null;
  const extraParams: Record<string, string> = {};
  params.forEach((value, key) => {
    const k = key.toLowerCase();
    if (!PER_PAYMENT_PARAMS.has(k) && value) extraParams[k] = value;
  });
  return { upiId: pa, payeeName: params.get('pn')?.trim() || DEFAULT_PAYEE.payeeName, extraParams };
}

/** UPI deep link (also what the QR encodes). `tr` is our reference for matching. */
export function upiPayUrl({
  payee = DEFAULT_PAYEE,
  amount,
  reference,
  note,
}: {
  payee?: UpiPayee;
  amount: number;
  reference?: string;
  note: string;
}) {
  const params: Array<[string, string]> = [
    ['pa', payee.upiId],
    ['pn', payee.payeeName],
    ...Object.entries(payee.extraParams),
    ['am', amount.toFixed(2)],
    ['cu', 'INR'],
    ['tn', note.slice(0, 50)],
  ];
  if (reference) params.push(['tr', reference]);
  // %20 for spaces and a literal @ — some UPI apps show "+" or reject "%40".
  const enc = (v: string) => encodeURIComponent(v).replace(/%40/g, '@');
  return `upi://pay?${params.map(([k, v]) => `${k}=${enc(v)}`).join('&')}`;
}

/**
 * UPI transaction IDs / UTRs are 12 digits for NPCI rails; some apps show
 * longer alphanumeric references. Accept 10–35 letters/digits, nothing else.
 */
export const UTR_PATTERN = /^[A-Za-z0-9]{10,35}$/;

export function normalizeUtr(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}
