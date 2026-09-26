'use client';

import { useApi } from '@/hooks/useApi';
import { DEFAULT_PAYEE, type UpiPayee } from '@/lib/upi';

/**
 * The UPI payee for payment QR codes, as set by the admin. `ready` is false
 * until it has loaded — don't show a QR before then, or a stale payee could
 * be scanned.
 */
export function usePaymentPayee() {
  const { data, error, loading, reload } = useApi<UpiPayee>('/api/settings/payment');
  return { payee: data ?? DEFAULT_PAYEE, ready: !!data, error, loading, reload };
}
