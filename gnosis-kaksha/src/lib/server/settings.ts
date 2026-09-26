import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_PAYEE, type UpiPayee } from '@/lib/upi';

export interface PaymentSettings extends UpiPayee {
  /** false = still using the built-in fallback, nobody has uploaded a QR yet */
  configured: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function getPaymentSettings(db: SupabaseClient): Promise<PaymentSettings> {
  const { data, error } = await db
    .from('app_settings')
    .select('value, updated_at, updated_by')
    .eq('key', 'upi_payee')
    .maybeSingle();
  if (error) throw error;
  const v = (data?.value ?? null) as Partial<UpiPayee> | null;
  if (!v?.upiId) return { ...DEFAULT_PAYEE, configured: false, updatedAt: null, updatedBy: null };
  return {
    upiId: v.upiId,
    payeeName: v.payeeName || DEFAULT_PAYEE.payeeName,
    extraParams: v.extraParams ?? {},
    configured: true,
    updatedAt: data?.updated_at ?? null,
    updatedBy: data?.updated_by ?? null,
  };
}
