import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate, formatINR } from '@/lib/format';
import { VerifyRow, VerifyShell } from '@/components/id-card/VerifyShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Verify Fee Receipt', robots: { index: false } };

/** "Rahul Sen" -> "R**** S**" so a receipt number alone does not leak a full name. */
const mask = (name: string) => name.split(/\s+/).map((w) => w[0] + '*'.repeat(Math.max(w.length - 1, 0))).join(' ');

// Opened by scanning the QR code printed on an official fee receipt.
export default async function VerifyReceiptPage({ params }: { params: Promise<{ number: string }> }) {
  const number = decodeURIComponent((await params).number).trim().slice(0, 40);
  const { data: t } = await createAdminClient()
    .from('transactions')
    .select('receipt_number, date, amount, student_name, status')
    .eq('receipt_number', number)
    .maybeSingle();

  if (!t || t.status !== 'verified') {
    return <VerifyShell kind="Fee receipt verification" tone="bad" statusLabel="NOT FOUND — no verified receipt with this number" />;
  }
  return (
    <VerifyShell kind="Fee receipt verification" tone="ok" statusLabel="GENUINE — Payment verified">
      <VerifyRow label="Receipt No." value={<span className="font-mono">{t.receipt_number}</span>} />
      <div className="grid grid-cols-2 gap-3">
        <VerifyRow label="Date" value={formatDate(t.date)} />
        <VerifyRow label="Amount" value={formatINR(Number(t.amount))} />
      </div>
      <VerifyRow label="Student" value={mask(t.student_name)} />
    </VerifyShell>
  );
}
