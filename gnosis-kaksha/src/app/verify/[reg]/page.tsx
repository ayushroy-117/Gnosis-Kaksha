import type { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionUser } from '@/lib/authz';
import { staffBranchScope } from '@/lib/server/institute';
import { documentUrls } from '@/lib/server/student-documents';
import { VerifyRow, VerifyShell } from '@/components/id-card/VerifyShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Verify Student ID', robots: { index: false } };

const STATUS = {
  active: { tone: 'ok', label: 'VALID — Active Student' },
  pending: { tone: 'warn', label: 'NOT VALID — Admission pending' },
  rejected: { tone: 'bad', label: 'NOT VALID — Admission not approved' },
} as const;

// Opened by scanning the QR code on a student ID card (or by /scan after a barcode scan).
// Anyone sees the name and validity. Signed-in staff also see the profile details.
export default async function VerifyStudentPage({ params }: { params: Promise<{ reg: string }> }) {
  const reg = decodeURIComponent((await params).reg).trim().slice(0, 40);
  const db = createAdminClient();

  const { data: s } = await db
    .from('students')
    .select('id, registration_number, full_name, class_number, stream, board, status, branch_id, mobile, parent_name, parent_phone, fee_state, branches(name)')
    .ilike('registration_number', reg)
    .maybeSingle();

  if (!s) {
    return <VerifyShell kind="Student ID verification" tone="bad" statusLabel="NOT FOUND — this ID is not registered" />;
  }

  const viewer = await getSessionUser();
  const staff = viewer && viewer.role !== 'student' ? viewer : null;
  const scope = staff ? staffBranchScope(staff) : null;
  const canSeeDetails = Boolean(staff) && (!scope || scope === s.branch_id);
  const canSeeFees = canSeeDetails && staff && (staff.role === 'admin' || staff.role === 'accountant');
  const photo = canSeeDetails ? (await documentUrls(db, [s.id])).get(s.id)?.photo : null;

  const st = STATUS[s.status as keyof typeof STATUS] ?? STATUS.rejected;
  const branch = (s.branches as unknown as { name: string } | null)?.name;

  return (
    <VerifyShell kind="Student ID verification" tone={st.tone} statusLabel={st.label}>
      <div className="flex items-start gap-4">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- auth-gated API image
          <img src={photo} alt={s.full_name} className="h-28 w-24 rounded-lg border object-cover" data-testid="verify-photo" />
        )}
        <div className="space-y-3">
          <VerifyRow label="Student" value={s.full_name} />
          <VerifyRow label="Registration No." value={<span className="font-mono">{s.registration_number}</span>} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <VerifyRow label="Class" value={`Class ${s.class_number}${s.stream ? ` · ${s.stream}` : ''}`} />
        <VerifyRow label="Branch" value={branch} />
      </div>
      {canSeeDetails && (
        <div className="space-y-3 border-t border-gray-100 pt-3" data-testid="verify-staff-details">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1295D8]">Staff view</p>
          <div className="grid grid-cols-2 gap-3">
            <VerifyRow label="Board" value={s.board} />
            <VerifyRow label="Student mobile" value={s.mobile} />
            <VerifyRow label="Father / guardian" value={s.parent_name} />
            <VerifyRow label="Guardian mobile" value={s.parent_phone} />
            {canSeeFees && <VerifyRow label="Fee status" value={String(s.fee_state).replace(/_/g, ' ')} />}
          </div>
        </div>
      )}
    </VerifyShell>
  );
}
