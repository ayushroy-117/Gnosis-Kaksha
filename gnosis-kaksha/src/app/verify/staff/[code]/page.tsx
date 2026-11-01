import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadStaffByCode } from '@/lib/server/staff';
import { formatDate } from '@/lib/format';
import { VerifyRow, VerifyShell, type VerifyTone } from '@/components/id-card/VerifyShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Verify Staff ID', robots: { index: false } };

// Opened by scanning the QR code on a staff ID card. The status is read live,
// so a card of someone who has since resigned or been terminated shows it.
export default async function VerifyStaffPage({ params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent((await params).code).trim().slice(0, 40);
  const staff = await loadStaffByCode(createAdminClient(), code);

  if (!staff) {
    return <VerifyShell kind="Staff ID verification" tone="bad" statusLabel="NOT FOUND — this ID is not registered" />;
  }

  const since = staff.statusChangedOn ? ` since ${formatDate(staff.statusChangedOn)}` : '';
  const status: { tone: VerifyTone; label: string } =
    staff.employmentStatus === 'active'
      ? { tone: 'ok', label: 'VALID — Currently working' }
      : staff.employmentStatus === 'resigned'
        ? { tone: 'bad', label: `NOT VALID — Resigned${since}` }
        : { tone: 'bad', label: `NOT VALID — Terminated${since}` };

  return (
    <VerifyShell kind="Staff ID verification" tone={status.tone} statusLabel={status.label}>
      <VerifyRow label="Name" value={staff.fullName} />
      <VerifyRow label="Staff ID" value={<span className="font-mono">{staff.staffCode}</span>} />
      <div className="grid grid-cols-2 gap-3">
        <VerifyRow label="Designation" value={staff.designation} />
        <VerifyRow label="Branch" value={staff.branchName} />
        <VerifyRow label="Date of joining" value={staff.dateOfJoining ? formatDate(staff.dateOfJoining) : null} />
        <VerifyRow
          label="Employment status"
          value={<span data-testid="employment-status">{staff.employmentStatus.charAt(0).toUpperCase() + staff.employmentStatus.slice(1)}</span>}
        />
      </div>
    </VerifyShell>
  );
}
