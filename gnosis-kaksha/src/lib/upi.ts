/** The institute's UPI payee details, used for every payment QR code. */
export const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || 'gnosiskaksha@upi';
export const UPI_PAYEE_NAME = 'Gnosis Kaksha';

/** UPI deep link (also what the QR encodes). `tr` is our reference for matching. */
export function upiPayUrl({ amount, reference, note }: { amount: number; reference?: string; note: string }) {
  const params = new URLSearchParams({ pa: UPI_ID, pn: UPI_PAYEE_NAME, am: amount.toFixed(2), cu: 'INR', tn: note });
  if (reference) params.set('tr', reference);
  return `upi://pay?${params.toString()}`;
}

/**
 * UPI transaction IDs / UTRs are 12 digits for NPCI rails; some apps show
 * longer alphanumeric references. Accept 10–35 letters/digits, nothing else.
 */
export const UTR_PATTERN = /^[A-Za-z0-9]{10,35}$/;

export function normalizeUtr(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}
