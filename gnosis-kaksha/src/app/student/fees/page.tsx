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
} from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getStudentData, formatINR, formatDate, FeePayment } from '@/lib/student-data';
import { useAuth } from '@/hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

const UPI_ID = 'gnosiskaksha@upi';

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

  const { feeStatus, subjects, profile } = studentData;

  const payableAmount = feeStatus.finalPayable;
  const isCleared = feeStatus.status === 'paid' || payableAmount === 0;

  const upiIntentUrl = useMemo(() => {
    return `upi://pay?pa=${UPI_ID}&pn=Gnosis+Kaksha&am=${payableAmount}&cu=INR&tn=Monthly+Tuition+${profile.registrationNumber}`;
  }, [payableAmount, profile.registrationNumber]);

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
          method: 'UPI',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Tuition fee cleared successfully!');
        setStudentData((prev) => ({
          ...prev,
          feeStatus: {
            ...prev.feeStatus,
            finalPayable: 0,
            status: 'paid',
            payments: [data.receipt, ...prev.feeStatus.payments],
          },
        }));
        setPayModalOpen(false);
        setActiveReceipt(data.receipt);
        setUtrNumber('');
      } else {
        toast.error(data.error || 'Payment verification failed');
      }
    } catch {
      toast.error('Failed to submit payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast.success('UPI ID copied to clipboard!');
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
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Fees & Payments</h1>
        <p className="mt-1 text-[#4A5568]">Your monthly tuition breakdown, instant UPI payment, and receipt ledger.</p>
      </div>

      {/* Amount payable banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full ${
            isCleared ? 'bg-green-100 text-green-600' : 'bg-[#CDE6F7] text-[#1295D8]'
          }`}>
            <Wallet size={26} />
          </div>
          <div>
            <p className="text-sm text-[#718096]">Amount payable</p>
            <p className="text-3xl font-bold text-[#1A2B4A]">
              {formatINR(payableAmount)}
            </p>
            <p className="mt-0.5 text-sm text-[#718096]">
              {isCleared ? 'September 2026 dues cleared' : `Due by ${formatDate(feeStatus.nextDueDate)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Badge tone={isCleared ? 'green' : 'amber'}>
            {isCleared ? 'All Dues Paid' : 'Payment due'}
          </Badge>
          {!isCleared ? (
            <button
              type="button"
              onClick={() => setPayModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] px-5 py-2.5 text-sm font-semibold text-white transition hover:shadow-lg active:scale-95"
            >
              <CreditCard size={16} /> Pay Monthly Tuition
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
              <CheckCircle2 size={15} /> All Cleared for September
            </span>
          )}
        </div>
      </div>

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
              <dd className="text-lg font-bold text-[#1295D8]">
                {formatINR(payableAmount)}
              </dd>
            </div>
          </dl>
        </SectionCard>

        {/* Payment history */}
        <SectionCard
          title="Payment History & Receipts"
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
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {p.status === 'paid' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1A2B4A]">
                    {p.description}
                  </p>
                  <p className="text-xs text-[#718096]">
                    {formatDate(p.date)} · {p.method} · <span className="font-mono">{p.id}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#1A2B4A]">
                    {formatINR(p.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveReceipt(p)}
                    title="View & Download official receipt"
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-[#1295D8] border border-[#CDE6F7] hover:bg-[#CDE6F7] transition"
                  >
                    <Download size={14} /> Receipt
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* UPI PAYMENT MODAL */}
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
                Instant UPI Payment
              </span>
              <h2 className="text-xl font-bold text-[#1A2B4A]">Pay Monthly Tuition</h2>
              <p className="text-xs text-gray-500">Student: {profile.fullName} ({profile.registrationNumber})</p>
            </div>

            {/* Payable Amount Banner */}
            <div className="rounded-xl bg-[#F0F7FD] border border-[#50B4F2] p-4 text-center mb-5">
              <p className="text-xs text-gray-500 uppercase font-semibold">Amount to Pay</p>
              <p className="text-3xl font-black text-[#1A2B4A] mt-0.5">₹{payableAmount}</p>
              <p className="text-[11px] text-gray-600 mt-1">Tuition for Class {profile.classNumber} ({profile.board})</p>
            </div>

            {/* QR Code and Instructions */}
            <div className="flex flex-col sm:flex-row gap-4 items-center mb-5 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="p-2 bg-white rounded-lg border border-gray-200 shrink-0">
                <QRCodeSVG value={upiIntentUrl} size={130} level="M" />
              </div>
              <div className="space-y-2 text-xs">
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

            {/* UTR Form */}
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
                  Verify & Clear Dues
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL PRINTABLE FEE RECEIPT MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl border border-gray-200 print:fixed print:inset-0 print:m-0 print:p-8 print:border-none print:shadow-none">
            {/* Close button (hidden in print) */}
            <button
              type="button"
              onClick={() => setActiveReceipt(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition print:hidden"
            >
              <X size={20} />
            </button>

            {/* Receipt Content */}
            <div className="border-b-2 border-gray-900 pb-4 text-center">
              <h2 className="text-2xl font-black tracking-tight text-[#1A2B4A]">GNOSIS KAKSHA</h2>
              <p className="text-xs text-gray-600">Premier Coaching & Academic Institute · Ramkrishna Nagar, Assam</p>
              <p className="text-xs font-bold uppercase tracking-wider text-[#1295D8] mt-1">Official Fee Receipt</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs py-4 border-b border-gray-200">
              <div>
                <span className="text-gray-500">Receipt No:</span>
                <p className="font-mono font-bold text-sm text-[#1A2B4A]">{activeReceipt.id}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Date:</span>
                <p className="font-semibold text-gray-800">{activeReceipt.date}</p>
              </div>
              <div>
                <span className="text-gray-500">Student Name:</span>
                <p className="font-bold text-[#1A2B4A]">{profile.fullName}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Reg. Number:</span>
                <p className="font-mono font-bold text-[#1295D8]">{profile.registrationNumber}</p>
              </div>
              <div>
                <span className="text-gray-500">Class / Stream:</span>
                <p className="font-semibold text-gray-800">Class {profile.classNumber} {profile.stream ? `· ${profile.stream}` : ''}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Payment Mode:</span>
                <p className="font-semibold text-gray-800">{activeReceipt.method} {activeReceipt.utr ? `(UTR: ${activeReceipt.utr})` : ''}</p>
              </div>
            </div>

            {/* Table */}
            <div className="py-4 border-b border-gray-200">
              <div className="flex justify-between text-xs font-bold text-gray-600 uppercase border-b pb-1">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="flex justify-between text-sm py-2">
                <span className="text-gray-800">{activeReceipt.description}</span>
                <span className="font-bold text-[#1A2B4A]">₹{activeReceipt.amount}</span>
              </div>
            </div>

            {/* Total Paid & Stamp */}
            <div className="flex justify-between items-center py-4 border-b border-gray-200">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
                  <ShieldCheck size={14} /> PAYMENT VERIFIED
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">Net Amount Paid</span>
                <p className="text-2xl font-black text-[#1295D8]">₹{activeReceipt.amount}</p>
              </div>
            </div>

            {/* Signatory Footer */}
            <div className="pt-6 flex justify-between items-end text-[10px] text-gray-500">
              <p>Computer-generated receipt · Gnosis Kaksha</p>
              <div className="text-center">
                <div className="w-28 border-b border-gray-400 mb-1" />
                <span>Authorized Signatory</span>
              </div>
            </div>

            {/* Action Bar (hidden when printing) */}
            <div className="mt-6 flex gap-3 print:hidden">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveReceipt(null)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-[#1295D8] hover:bg-[#2E5EAA]"
              >
                <Printer size={16} className="mr-1.5" /> Print / Save PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
