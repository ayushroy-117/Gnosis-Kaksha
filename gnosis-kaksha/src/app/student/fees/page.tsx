'use client';

import { useState, useMemo } from 'react';
import {
  Wallet,
  Download,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  X,
  CreditCard,
  ShieldCheck,
  MessageSquare,
  AlertCircle,
  Hourglass,
} from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatINR, formatDate, type FeePayment } from '@/lib/student-data';
import { useStudentPortal } from '@/hooks/useStudentPortal';
import { apiFetch } from '@/hooks/useApi';
import { UPI_ID, upiPayUrl, normalizeUtr, UTR_PATTERN } from '@/lib/upi';
import { OFFICE_PHONE_E164 } from '@/lib/institute-contact';
import { QRCodeSVG } from 'qrcode.react';
import { OfficialFeeReceiptModal } from '@/components/dashboard/OfficialFeeReceiptModal';
import toast from 'react-hot-toast';

/** Unique reference embedded in the QR (tr=) so the office can match payments. */
function generateUpiReference(registrationNumber: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const reg = registrationNumber.replace(/[^A-Z0-9]/g, '').slice(-6);
  return `GK${reg}${ts}`;
}

export default function StudentFeesPage() {
  const { data, error, loading, reload, viewingAs } = useStudentPortal();
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<FeePayment | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [utrError, setUtrError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [upiReference, setUpiReference] = useState('');

  const pendingTxn = useMemo(() => data?.feeStatus.payments.find((p) => p.status === 'pending'), [data]);
  const lastRejected = useMemo(() => {
    const latest = data?.feeStatus.payments[0];
    return latest?.status === 'rejected' ? latest : undefined;
  }, [data]);

  if (loading && !data) return <LoadingState label="Loading your fees…" />;
  if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return null;

  const { feeStatus, subjects, profile } = data;
  const isAdmission = profile.enrollmentStatus === 'pending';
  const payableAmount = feeStatus.finalPayable;
  const isCleared = feeStatus.status === 'paid' || payableAmount === 0;
  const isPendingVerification = feeStatus.status === 'pending_verification';
  const canPay = !viewingAs && !isCleared && !isPendingVerification && profile.enrollmentStatus !== 'rejected';
  const payLabel = isAdmission ? 'Pay Admission Fee' : 'Pay Monthly Tuition';

  const upiIntentUrl = upiPayUrl({
    amount: payableAmount,
    reference: upiReference,
    note: `${isAdmission ? 'Admission' : 'Tuition'} ${profile.registrationNumber}`,
  });

  const openPayModal = () => {
    setUpiReference(generateUpiReference(profile.registrationNumber));
    setUtrNumber('');
    setUtrError(null);
    setPayModalOpen(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const utr = normalizeUtr(utrNumber);
    if (!UTR_PATTERN.test(utr)) {
      setUtrError('Enter the UPI transaction ID exactly as shown in your payment app (usually 12 digits).');
      return;
    }
    setUtrError(null);
    setIsProcessing(true);
    try {
      await apiFetch('/api/student/pay-fee', { method: 'POST', json: { utr, upiReference } });
      toast.success('Payment submitted! The office will verify it shortly.');
      setPayModalOpen(false);
      setUtrNumber('');
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit payment. Please try again.';
      setUtrError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast.success('UPI ID copied!');
  };

  const copyReference = () => {
    navigator.clipboard.writeText(upiReference);
    toast.success('Reference ID copied!');
  };

  const breakdown = [
    ...subjects.map((s) => ({
      label: `${s.name} (tuition)`,
      value: s.monthlyFee,
      tone: 'default' as const,
    })),
    { label: 'Monthly Tuition (subtotal)', value: feeStatus.monthlyTuition, tone: 'subtotal' as const },
    {
      label: `Scholarship discount (${feeStatus.scholarshipPercent}%)`,
      value: -feeStatus.scholarshipAmount,
      tone: 'discount' as const,
    },
    { label: 'Tuition after scholarship', value: feeStatus.tuitionAfterScholarship, tone: 'subtotal' as const },
    ...(isAdmission
      ? [
          { label: 'Examination fee (Annual)', value: feeStatus.examFee, tone: 'default' as const },
          { label: 'Institute T-shirt (at admission)', value: feeStatus.tshirtFee, tone: 'default' as const },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Fees &amp; Payments</h1>
        <p className="mt-1 text-[#4A5568]">Your monthly tuition breakdown, UPI payment, and receipt ledger.</p>
      </div>

      {/* Amount payable / status banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              isCleared
                ? 'bg-green-100 text-green-600'
                : isPendingVerification
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-[#CDE6F7] text-[#1295D8]'
            }`}
          >
            {isCleared ? <CheckCircle2 size={26} /> : isPendingVerification ? <Hourglass size={26} /> : <Wallet size={26} />}
          </div>
          <div>
            <p className="text-sm text-[#718096]">Amount payable</p>
            <p className="text-3xl font-bold text-[#1A2B4A]">{formatINR(payableAmount)}</p>
            <p className="mt-0.5 text-sm text-[#718096]">
              {isCleared
                ? `Next due ${formatDate(feeStatus.nextDueDate)}`
                : isPendingVerification
                  ? 'Payment submitted — awaiting verification by the office'
                  : isAdmission
                    ? 'Admission fee — first month, exam fee & T-shirt'
                    : `Due by ${formatDate(feeStatus.nextDueDate)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Badge tone={isCleared ? 'green' : isPendingVerification ? 'amber' : 'amber'}>
            {isCleared ? 'All Dues Paid' : isPendingVerification ? 'Pending Verification' : 'Payment due'}
          </Badge>

          {canPay && (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`https://wa.me/${OFFICE_PHONE_E164}?text=${encodeURIComponent(
                  `Hello Accounts Desk, I am ${profile.fullName} (Reg: ${profile.registrationNumber}, Class ${profile.classNumber}). I have a query regarding my pending fee of ₹${payableAmount}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
              >
                <MessageSquare size={14} /> WhatsApp Help
              </a>
              <button
                type="button"
                onClick={openPayModal}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] px-5 py-2.5 text-sm font-semibold text-white transition hover:shadow-lg active:scale-95"
              >
                <CreditCard size={16} /> {payLabel}
              </button>
            </div>
          )}

          {isPendingVerification && (
            <div className="flex flex-col items-end gap-1.5 text-right">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                <Clock size={14} /> Under review by Accounts Desk
              </span>
              {pendingTxn?.utr && (
                <p className="text-[11px] text-gray-500 font-mono">UTR: {pendingTxn.utr}</p>
              )}
            </div>
          )}

          {isCleared && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
              <CheckCircle2 size={15} /> All dues cleared
            </span>
          )}
        </div>
      </div>

      {/* Admission status */}
      {isAdmission && (
        <div className="flex items-start gap-3 rounded-xl border border-[#CDE6F7] bg-[#F0F7FD] px-5 py-4">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#1295D8]" />
          <p className="text-sm text-[#2E5EAA]">
            <span className="font-semibold">Your admission is not complete yet.</span> Your portal unlocks as soon as the
            office verifies your admission payment.
          </p>
        </div>
      )}
      {profile.enrollmentStatus === 'rejected' && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">
            Your application was not approved. Please contact the institute office for details.
          </p>
        </div>
      )}

      {/* Last submission rejected */}
      {lastRejected && !isPendingVerification && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <div className="text-sm">
            <p className="font-semibold text-red-800">Your last payment submission was not accepted</p>
            <p className="mt-0.5 text-red-700">
              {lastRejected.rejectedNote ? <>Reason: {lastRejected.rejectedNote}. </> : null}
              {lastRejected.utr && <>Transaction ID <span className="font-mono">{lastRejected.utr}</span>. </>}
              {canPay && 'If you did pay, submit the correct transaction ID again.'}
            </p>
          </div>
        </div>
      )}

      {/* Pending verification notice bar */}
      {isPendingVerification && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <Hourglass size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800">Payment Pending Verification</p>
            <p className="mt-0.5 text-amber-700">
              Your UPI payment has been submitted and is awaiting verification by the Accounts Desk.
              {pendingTxn?.utr && (
                <> Your UTR <span className="font-mono font-bold">{pendingTxn.utr}</span> has been recorded.</>
              )}
              {' '}You will see your receipt here once it is approved.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Breakdown */}
        <SectionCard title="Fee Breakdown" className="lg:col-span-2" bodyClassName="p-0">
          <dl className="divide-y divide-gray-100">
            {breakdown.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 px-6 py-3 text-sm"
              >
                <dt
                  className={
                    row.tone === 'subtotal'
                      ? 'font-semibold text-[#1A2B4A]'
                      : 'text-[#4A5568]'
                  }
                >
                  {row.label}
                </dt>
                <dd
                  className={
                    row.tone === 'discount'
                      ? 'font-semibold text-[#10B981]'
                      : row.tone === 'subtotal'
                        ? 'font-semibold text-[#1A2B4A]'
                        : 'font-medium text-[#1A2B4A]'
                  }
                >
                  {row.value < 0 ? `−${formatINR(-row.value)}` : formatINR(row.value)}
                </dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 bg-[#F7FAFC] px-6 py-4">
              <dt className="text-base font-bold text-[#1A2B4A]">{isAdmission ? 'Admission Total' : 'Amount Due Now'}</dt>
              <dd className="text-lg font-bold text-[#1295D8]">{formatINR(payableAmount)}</dd>
            </div>
          </dl>
        </SectionCard>

        {/* Payment history */}
        <SectionCard
          title="Payment History &amp; Receipts"
          description="Click download to view or print official receipts"
          className="lg:col-span-3"
          bodyClassName="p-0"
        >
          {feeStatus.payments.length === 0 && (
            <div className="p-6">
              <EmptyState icon={Wallet} title="No payments yet" message="Your submitted payments and receipts will appear here." />
            </div>
          )}
          <ul className="divide-y divide-gray-100">
            {feeStatus.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    p.status === 'paid'
                      ? 'bg-green-100 text-green-600'
                      : p.status === 'pending'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-red-100 text-red-500'
                  }`}
                >
                  {p.status === 'paid' ? (
                    <CheckCircle2 size={20} />
                  ) : p.status === 'pending' ? (
                    <Hourglass size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1A2B4A]">{p.description}</p>
                  <p className="text-xs text-[#718096]">
                    {formatDate(p.date)} · {p.method} ·{' '}
                    <span className="font-mono">{p.receiptNumber || p.id}</span>
                    {p.utr && (
                      <> · UTR: <span className="font-mono">{p.utr}</span></>
                    )}
                  </p>
                  {p.status === 'rejected' && p.rejectedNote && (
                    <p className="mt-0.5 text-xs text-red-600">Not accepted: {p.rejectedNote}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#1A2B4A]">{formatINR(p.amount)}</span>
                  {p.status === 'paid' ? (
                    <button
                      type="button"
                      onClick={() => setActiveReceipt(p)}
                      title="View & Download official receipt"
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-[#1295D8] border border-[#CDE6F7] hover:bg-[#CDE6F7] transition"
                    >
                      <Download size={14} /> Receipt
                    </button>
                  ) : p.status === 'pending' ? (
                    <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50">
                      <Clock size={12} /> Verifying
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200 bg-red-50">
                      Rejected
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* ── UPI PAYMENT MODAL ─────────────────────────────────────────────── */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="pay-title" className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setPayModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#2E5EAA] bg-[#CDE6F7] px-2.5 py-0.5 rounded-full mb-1">
                Secure UPI Payment
              </span>
              <h2 id="pay-title" className="text-xl font-bold text-[#1A2B4A]">{payLabel}</h2>
              <p className="text-xs text-gray-500">
                Student: {profile.fullName} ({profile.registrationNumber})
              </p>
            </div>

            {/* Amount Banner */}
            <div className="rounded-xl bg-[#F0F7FD] border border-[#50B4F2] p-4 text-center mb-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">Amount to Pay</p>
              <p className="text-3xl font-black text-[#1A2B4A] mt-0.5">{formatINR(payableAmount)}</p>
              <p className="text-[11px] text-gray-600 mt-1">
                {isAdmission ? 'Admission' : 'Tuition'} for Class {profile.classNumber} ({profile.board})
              </p>
            </div>

            {/* Transaction Reference */}
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-2.5 flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Payment Reference ID</p>
                <p className="font-mono text-sm font-bold text-[#1A2B4A]">{upiReference}</p>
              </div>
              <button
                type="button"
                onClick={copyReference}
                className="p-1.5 rounded bg-white border border-gray-300 hover:bg-gray-100 text-[#1295D8]"
                title="Copy reference"
              >
                <Copy size={13} />
              </button>
            </div>

            {/* QR & instructions */}
            <div className="flex flex-col sm:flex-row gap-4 items-center mb-5 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="p-2 bg-white rounded-lg border border-gray-200 shrink-0">
                {/* Dynamic QR with amount + reference locked */}
                <QRCodeSVG value={upiIntentUrl} size={130} level="M" />
              </div>
              <div className="space-y-2.5 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-0.5">Scan to pay {formatINR(payableAmount)} exactly</p>
                  <p className="text-gray-600">Open <strong>GPay / PhonePe / Paytm</strong> and scan — the amount is pre-filled and locked.</p>
                </div>
                <div>
                  <span className="text-gray-500 font-medium">UPI ID:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-[#1A2B4A] bg-white px-2 py-1 rounded border border-gray-300">
                      {UPI_ID}
                    </span>
                    <button
                      type="button"
                      onClick={copyUpiId}
                      className="p-1.5 rounded bg-white border border-gray-300 hover:bg-gray-100 text-[#1295D8]"
                      title="Copy UPI ID"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
                <a
                  href={upiIntentUrl}
                  className="inline-flex items-center gap-1.5 text-xs text-[#1295D8] font-semibold hover:underline"
                >
                  <ExternalLink size={13} /> Open in PhonePe / GPay / Paytm
                </a>
              </div>
            </div>

            {/* UTR form */}
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 mb-4 text-xs text-blue-800">
              <strong>After paying:</strong> open your UPI app → transaction history → copy the UPI transaction ID
              (usually 12 digits, sometimes called UTR or UPI Ref No.) and paste it below. Pay the exact amount shown.
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <Input
                label="12-Digit UPI Transaction ID / UTR"
                placeholder="e.g. 481920491823"
                value={utrNumber}
                onChange={(e) => { setUtrNumber(e.target.value); setUtrError(null); }}
                error={utrError ?? undefined}
                inputMode="text"
                autoComplete="off"
                required
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPayModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isProcessing}
                  className="flex-1 bg-[#10B981] hover:bg-[#059669]"
                >
                  Submit for Verification
                </Button>
              </div>
            </form>

            <p className="mt-3 text-center text-[11px] text-gray-400">
              <ShieldCheck size={11} className="inline mr-1" />
              Do not share your UPI PIN with anyone. Authorization happens inside your UPI app only.
            </p>
          </div>
        </div>
      )}

      {/* OFFICIAL PRINTABLE FEE RECEIPT MODAL */}
      {activeReceipt && (
        <OfficialFeeReceiptModal
          receipt={{ ...activeReceipt, id: activeReceipt.receiptNumber || activeReceipt.id, status: 'verified' }}
          student={{
            fullName: profile.fullName,
            registrationNumber: profile.registrationNumber,
            classNumber: profile.classNumber,
            stream: profile.stream,
            board: profile.board,
            parentName: profile.parentName,
            mobile: profile.mobile,
            address: profile.address,
          }}
          onClose={() => setActiveReceipt(null)}
          copyType="STUDENT COPY"
        />
      )}
    </div>
  );
}
