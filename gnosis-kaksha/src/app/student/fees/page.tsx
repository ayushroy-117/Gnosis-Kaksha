'use client';

import { useState, useMemo } from 'react';
import {
  Wallet,
  Download,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Printer,
  X,
  CreditCard,
  ShieldCheck,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Hourglass,
} from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getStudentData, formatINR, formatDate, FeePayment } from '@/lib/student-data';
import { useAuth } from '@/hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';
import { OfficialFeeReceiptModal } from '@/components/dashboard/OfficialFeeReceiptModal';
import toast from 'react-hot-toast';

const UPI_ID = 'gnosiskaksha@upi';
const INSTITUTION_NAME = 'Gnosis+Kaksha';

/** Generate a unique UPI payment reference for this session's transaction */
function generateUpiReference(registrationNumber: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const reg = registrationNumber.replace(/[^A-Z0-9]/g, '').slice(-6);
  return `GK${reg}${ts}`;
}

export default function StudentFeesPage() {
  const { user } = useAuth();
  const initialData = useMemo(() => {
    const identifier = user?.registrationNumber || user?.email || user?.id;
    return getStudentData(identifier);
  }, [user]);

  const [studentData, setStudentData] = useState(initialData);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<FeePayment | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Stable unique reference for this payment session — regenerates when modal opens
  const [upiReference] = useState(() =>
    generateUpiReference(initialData.profile.registrationNumber)
  );

  const { feeStatus, subjects, profile } = studentData;

  const payableAmount = feeStatus.finalPayable;
  const isCleared = feeStatus.status === 'paid' || payableAmount === 0;
  const isPendingVerification = feeStatus.status === 'pending_verification';

  // The pending transaction (so student can see submitted UTR)
  const pendingTxn = useMemo(
    () => feeStatus.payments.find((p) => p.status === 'pending'),
    [feeStatus.payments]
  );

  /**
   * Dynamic UPI deep-link.
   * - `pa`  = payee UPI ID
   * - `pn`  = payee name
   * - `am`  = exact amount (locked in dynamic QR)
   * - `cu`  = currency
   * - `tr`  = transaction reference (unique per payment — used for matching)
   * - `tn`  = transaction note (shows in the payer's app)
   */
  const upiIntentUrl = useMemo(() => {
    return (
      `upi://pay?pa=${UPI_ID}` +
      `&pn=${INSTITUTION_NAME}` +
      `&am=${payableAmount}` +
      `&cu=INR` +
      `&tr=${upiReference}` +
      `&tn=Tuition+${profile.registrationNumber}+${upiReference}`
    );
  }, [payableAmount, profile.registrationNumber, upiReference]);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber || utrNumber.trim().length < 6) {
      toast.error('Please enter a valid 12-digit UPI Transaction / UTR ID');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/student/pay-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: profile.id,
          identifier: profile.registrationNumber,
          amount: payableAmount,
          utr: utrNumber.trim(),
          upiReference,
          method: 'UPI',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Payment submitted! Awaiting accountant verification.');
        setStudentData((prev) => ({
          ...prev,
          feeStatus: {
            ...prev.feeStatus,
            status: 'pending_verification',
            payments: [
              {
                ...data.receipt,
                id: data.receipt?.id || `PAY-${Date.now()}`,
                date: data.receipt?.date || new Date().toISOString().split('T')[0],
                description: data.receipt?.description || `Monthly Tuition — ${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} (Pending Verification)`,
                amount: payableAmount,
                method: 'UPI',
                status: 'pending',
                utr: utrNumber.trim(),
              },
              ...prev.feeStatus.payments,
            ],
          },
        }));
        setPayModalOpen(false);
        setUtrNumber('');
      } else {
        toast.error(data.error || 'Payment submission failed');
      }
    } catch {
      toast.error('Failed to submit payment. Please try again.');
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
    { label: 'Examination fee (Annual)', value: feeStatus.examFee, tone: 'default' as const },
    { label: 'Institute T-shirt (Included at Admission)', value: feeStatus.tshirtFee, tone: 'default' as const },
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
                ? 'September 2026 dues cleared'
                : isPendingVerification
                  ? 'Payment submitted — awaiting accountant verification'
                  : `Due by ${formatDate(feeStatus.nextDueDate)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Badge tone={isCleared ? 'green' : isPendingVerification ? 'amber' : 'amber'}>
            {isCleared ? 'All Dues Paid' : isPendingVerification ? 'Pending Verification' : 'Payment due'}
          </Badge>

          {!isCleared && !isPendingVerification && (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`https://wa.me/919435012345?text=${encodeURIComponent(
                  `Hello Accounts Desk, I am ${profile.fullName} (Reg: ${profile.registrationNumber}, Class ${profile.classNumber}). I have a query regarding my pending tuition fee of ₹${payableAmount}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
              >
                <MessageSquare size={14} /> WhatsApp Help
              </a>
              <button
                type="button"
                onClick={() => setPayModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] px-5 py-2.5 text-sm font-semibold text-white transition hover:shadow-lg active:scale-95"
              >
                <CreditCard size={16} /> Pay Monthly Tuition
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
              <CheckCircle2 size={15} /> All Cleared for September
            </span>
          )}
        </div>
      </div>

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
              {' '}You will see your receipt here once approved (usually within 24 hours).
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
              <dt className="text-base font-bold text-[#1A2B4A]">Total Monthly Due</dt>
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
                    <span className="font-mono">{p.id}</span>
                    {p.utr && (
                      <> · UTR: <span className="font-mono">{p.utr}</span></>
                    )}
                  </p>
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
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* ── UPI PAYMENT MODAL ─────────────────────────────────────────────── */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => setPayModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#2E5EAA] bg-[#CDE6F7] px-2.5 py-0.5 rounded-full mb-1">
                Secure UPI Payment
              </span>
              <h2 className="text-xl font-bold text-[#1A2B4A]">Pay Monthly Tuition</h2>
              <p className="text-xs text-gray-500">
                Student: {profile.fullName} ({profile.registrationNumber})
              </p>
            </div>

            {/* Amount Banner */}
            <div className="rounded-xl bg-[#F0F7FD] border border-[#50B4F2] p-4 text-center mb-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">Amount to Pay</p>
              <p className="text-3xl font-black text-[#1A2B4A] mt-0.5">₹{payableAmount}</p>
              <p className="text-[11px] text-gray-600 mt-1">
                Tuition for Class {profile.classNumber} ({profile.board})
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
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-0.5">Scan to pay ₹{payableAmount} exactly</p>
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
              <strong>After paying:</strong> Open your UPI app → Transaction History → copy the 12-digit UTR/Reference number and paste it below.
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <Input
                label="12-Digit UPI Transaction ID / UTR"
                placeholder="e.g. 481920491823"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
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
          receipt={activeReceipt}
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
