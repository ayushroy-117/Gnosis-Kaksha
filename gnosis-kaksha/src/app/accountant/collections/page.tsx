'use client';

import { useState, useEffect } from 'react';
import {
  Wallet,
  IndianRupee,
  CheckCircle2,
  X,
  CreditCard,
  MessageSquare,
  Send,
  Hourglass,
  ShieldCheck,
  XCircle,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { WhatsAppReminderModal } from '@/components/dashboard/WhatsAppReminderModal';
import { BatchWhatsAppModal } from '@/components/dashboard/BatchWhatsAppModal';
import { OfficialFeeReceiptModal } from '@/components/dashboard/OfficialFeeReceiptModal';
import {
  getAccountantData,
  classLabel,
  formatINR,
  RosterStudent,
  Transaction,
} from '@/lib/institute-data';
import { formatDate } from '@/lib/format';
import toast from 'react-hot-toast';

export default function AccountantCollectionsPage() {
  const initialData = getAccountantData();
  const [roster, setRoster] = useState<RosterStudent[]>(initialData.roster);
  const [pendingVerifications, setPendingVerifications] = useState<Transaction[]>(
    initialData.pendingVerifications
  );
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);
  const [whatsAppStudent, setWhatsAppStudent] = useState<RosterStudent | null>(null);
  const [showBatchWhatsApp, setShowBatchWhatsApp] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
  const [utrNumber, setUtrNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<Transaction | null>(null);
  const [rejectedNote, setRejectedNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Receipt preview after approval
  const [approvedReceipt, setApprovedReceipt] = useState<Transaction | null>(null);

  // Fetch real live pending transactions from database
  useEffect(() => {
    async function loadLivePending() {
      try {
        const res = await fetch('/api/admin/transactions?status=pending');
        if (res.ok) {
          const data = await res.json();
          if (data.transactions && Array.isArray(data.transactions) && data.transactions.length > 0) {
            const mapped: Transaction[] = data.transactions.map((t: any) => ({
              id: t.id,
              date: t.date,
              studentId: t.student_id,
              studentName: t.student_name || t.students?.full_name || 'Student',
              description: t.description,
              amount: Number(t.amount),
              method: t.method || 'UPI',
              utr: t.utr || '—',
              status: 'pending',
            }));
            setPendingVerifications(mapped);
          }
        }
      } catch (err) {
        console.warn('Failed to load pending transactions from DB:', err);
      }
    }
    loadLivePending();
  }, []);

  const active = roster
    .filter((s) => s.status === 'active')
    .sort((a, b) => {
      // pending_verification goes to top of "due" group
      const order = (f: string) => (f === 'due' ? 0 : f === 'pending_verification' ? 1 : 2);
      if (a.feeState !== b.feeState) return order(a.feeState) - order(b.feeState);
      return a.fullName.localeCompare(b.fullName);
    });

  const collectedThisMonth = roster
    .filter((s) => s.status === 'active' && s.feeState === 'paid')
    .reduce((sum, s) => sum + s.tuitionAfterScholarship, 0);

  const pendingDues = roster
    .filter((s) => s.status === 'active' && s.feeState === 'due')
    .reduce((sum, s) => sum + s.amountDue, 0);

  // ── Accountant records manual payment (cash / UPI at counter) ────────────
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    if (paymentMethod === 'UPI' && (!utrNumber || utrNumber.trim().length < 6)) {
      toast.error('Please enter a valid UPI Transaction / UTR number');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          amount: selectedStudent.amountDue,
          method: paymentMethod,
          utr: paymentMethod === 'UPI' ? utrNumber.trim() : `CASH-${Date.now().toString().slice(-6)}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Fee payment recorded for ${selectedStudent.fullName}!`);
        setRoster((prev) =>
          prev.map((s) =>
            s.id === selectedStudent.id
              ? { ...s, feeState: 'paid', amountDue: 0 }
              : s
          )
        );
        setSelectedStudent(null);
        setUtrNumber('');
        setPaymentMethod('Cash');
      } else {
        toast.error(data.error || 'Failed to record payment');
      }
    } catch {
      toast.error('An error occurred while recording payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Approve a pending student UPI payment ────────────────────────────────
  const handleApprove = async (txn: Transaction) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/accountant/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: txn.id,
          action: 'approve',
          verifiedBy: 'Accountant',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Payment approved! Receipt ${data.receiptId} generated.`);
        // Remove from pending queue
        setPendingVerifications((prev) => prev.filter((t) => t.id !== txn.id));
        // Update student in roster
        setRoster((prev) =>
          prev.map((s) =>
            s.id === txn.studentId ? { ...s, feeState: 'paid', amountDue: 0 } : s
          )
        );
        // Show receipt modal
        setApprovedReceipt({
          ...txn,
          id: data.receiptId || txn.id,
          status: 'verified',
        });
      } else {
        toast.error(data.error || 'Approval failed');
      }
    } catch {
      toast.error('Error approving payment');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Reject a pending student UPI payment ─────────────────────────────────
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;

    if (!rejectedNote.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }

    setIsRejecting(true);
    try {
      const res = await fetch('/api/accountant/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: rejectTarget.id,
          action: 'reject',
          rejectedNote: rejectedNote.trim(),
          verifiedBy: 'Accountant',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Payment rejected. Student reverted to due.');
        setPendingVerifications((prev) => prev.filter((t) => t.id !== rejectTarget.id));
        setRoster((prev) =>
          prev.map((s) =>
            s.id === rejectTarget.studentId ? { ...s, feeState: 'due' } : s
          )
        );
        setRejectTarget(null);
        setRejectedNote('');
      } else {
        toast.error(data.error || 'Rejection failed');
      }
    } catch {
      toast.error('Error rejecting payment');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Collections</h1>
        <p className="mt-1 text-[#4A5568]">
          Fee ledger for {initialData.currentPeriod}. Verify student UPI payments, record counter collections, and track dues.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Collected this month</p>
          <p className="mt-1 text-2xl font-bold text-[#10B981]">{formatINR(collectedThisMonth)}</p>
        </div>
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[#718096]">Outstanding dues</p>
            <p className="mt-1 text-2xl font-bold text-[#F59E0B]">{formatINR(pendingDues)}</p>
          </div>
          {pendingDues > 0 && (
            <button
              type="button"
              onClick={() => setShowBatchWhatsApp(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-xs transition"
            >
              <Send size={13} /> Broadcast WhatsApp
            </button>
          )}
        </div>
        <div
          className={`rounded-[12px] border p-5 shadow-sm flex items-center gap-3 ${
            pendingVerifications.length > 0
              ? 'border-amber-300 bg-amber-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <Hourglass
            size={22}
            className={pendingVerifications.length > 0 ? 'text-amber-500' : 'text-gray-400'}
          />
          <div>
            <p className="text-sm text-[#718096]">Pending UPI Verifications</p>
            <p className={`mt-0.5 text-2xl font-bold ${pendingVerifications.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {pendingVerifications.length}
            </p>
          </div>
        </div>
      </div>

      {/* ── PENDING UPI VERIFICATIONS QUEUE ─────────────────────────────── */}
      {pendingVerifications.length > 0 && (
        <SectionCard
          title={`Pending UPI Verifications (${pendingVerifications.length})`}
          description="Students who paid via UPI and submitted their UTR — verify against your bank/UPI app before approving."
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Submitted</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3">UTR Number</th>
                  <th className="px-6 py-3">QR Reference</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingVerifications.map((txn) => {
                  const stu = roster.find((s) => s.id === txn.studentId);
                  return (
                    <tr key={txn.id} className="hover:bg-amber-50/60 transition">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1A2B4A]">{txn.studentName}</p>
                        <p className="text-xs font-mono text-[#718096]">
                          {stu?.registrationNumber ?? txn.studentId}
                        </p>
                        {stu && (
                          <p className="text-xs text-[#718096]">{classLabel(stu)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#4A5568]">
                        {formatDate(txn.date)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-[#1A2B4A]">
                        {formatINR(txn.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-[#1A2B4A] bg-gray-100 px-2 py-0.5 rounded">
                          {txn.utr || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-[#4A5568]">
                          {txn.upiReference || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(txn)}
                            disabled={isProcessing}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition shadow-xs"
                          >
                            <ShieldCheck size={13} /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRejectTarget(txn); setRejectedNote(''); }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 hover:bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition shadow-xs"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-amber-100 bg-amber-50 px-6 py-3 flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-700">
              Always cross-check the UTR and Reference ID against your bank's UPI transaction report before approving. Approving generates the official receipt and marks the student as paid.
            </p>
          </div>
        </SectionCard>
      )}

      {/* ── STUDENT TUITION LEDGER ────────────────────────────────────────── */}
      {active.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No active students"
          message="Fee ledgers appear here once students are enrolled."
        />
      ) : (
        <SectionCard title="Student Tuition Ledger" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3 text-right">Monthly Fee</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {active.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F7FAFC] transition">
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1A2B4A]">{s.fullName}</p>
                        <p className="text-xs font-mono text-[#718096]">{s.registrationNumber}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#4A5568]">
                      {classLabel(s)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-[#1A2B4A]">
                      {formatINR(s.tuitionAfterScholarship)}
                    </td>
                    <td className="px-6 py-4">
                      {s.feeState === 'paid' ? (
                        <Badge tone="green">Paid</Badge>
                      ) : s.feeState === 'pending_verification' ? (
                        <Badge tone="amber">Pending Verification</Badge>
                      ) : (
                        <Badge tone="amber">Due · {formatINR(s.amountDue)}</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.feeState === 'due' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setWhatsAppStudent(s)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white transition shadow-xs"
                            title="Send WhatsApp payment reminder"
                          >
                            <MessageSquare size={13} /> WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(s)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1295D8] hover:bg-[#2E5EAA] px-3 py-1.5 text-xs font-semibold text-white transition shadow-xs"
                          >
                            <IndianRupee size={14} /> Record Payment
                          </button>
                        </div>
                      ) : s.feeState === 'pending_verification' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                          <Hourglass size={14} /> Verifying
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
                          <CheckCircle2 size={14} /> Cleared
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── RECORD MANUAL PAYMENT MODAL ─────────────────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => setSelectedStudent(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            >
              <X size={20} />
            </button>

            <div className="mb-4 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2E5EAA] bg-[#CDE6F7] px-2.5 py-0.5 rounded-full">
                Accountant Desk
              </span>
              <h2 className="text-xl font-bold text-[#1A2B4A] mt-1">Record Fee Collection</h2>
              <p className="text-xs text-gray-500">
                {selectedStudent.fullName} ({selectedStudent.registrationNumber})
              </p>
            </div>

            <div className="rounded-xl bg-[#F0F7FD] border border-[#50B4F2] p-4 text-center mb-5">
              <span className="text-xs uppercase font-semibold text-gray-500">Outstanding Tuition Due</span>
              <p className="text-3xl font-black text-[#1A2B4A] mt-0.5">{formatINR(selectedStudent.amountDue)}</p>
              <p className="text-xs text-gray-600 mt-1">{classLabel(selectedStudent)} · {selectedStudent.board}</p>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <Select
                label="Payment Method"
                options={[
                  { value: 'Cash', label: 'Cash (Physical Counter Collection)' },
                  { value: 'UPI', label: 'UPI (Bank Transfer / QR Verification)' },
                ]}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'UPI')}
              />

              {paymentMethod === 'UPI' && (
                <Input
                  label="12-Digit UPI Transaction / UTR Number"
                  placeholder="e.g. 581920491823"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  required
                />
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedStudent(null)}
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
                  Confirm &amp; Clear Due
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REJECT PAYMENT MODAL ─────────────────────────────────────────── */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => setRejectTarget(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            >
              <X size={20} />
            </button>

            <div className="mb-5 text-center">
              <div className="flex justify-center mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
                  <XCircle size={24} />
                </div>
              </div>
              <h2 className="text-xl font-bold text-[#1A2B4A]">Reject Payment</h2>
              <p className="mt-1 text-xs text-gray-500">
                {rejectTarget.studentName} · UTR: {rejectTarget.utr}
              </p>
            </div>

            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 mb-4 text-xs text-red-700">
              Rejecting will revert the student's status to <strong>Due</strong> and they will be prompted to re-submit.
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <Input
                label="Reason for Rejection"
                placeholder="e.g. UTR not found in bank statement, amount mismatch..."
                value={rejectedNote}
                onChange={(e) => setRejectedNote(e.target.value)}
                required
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectTarget(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isRejecting}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── APPROVED RECEIPT MODAL ───────────────────────────────────────── */}
      {approvedReceipt && (() => {
        const stu = roster.find((s) => s.id === approvedReceipt.studentId);
        return (
          <OfficialFeeReceiptModal
            receipt={approvedReceipt}
            student={{
              fullName: approvedReceipt.studentName,
              registrationNumber: stu?.registrationNumber || approvedReceipt.studentId,
              classNumber: stu?.classNumber,
              stream: stu?.stream,
              parentName: stu?.parentName,
              mobile: stu?.mobile,
              address: stu?.address,
            }}
            onClose={() => setApprovedReceipt(null)}
            copyType="OFFICE COPY"
          />
        );
      })()}

      {/* WhatsApp Reminder Modal (Single Student) */}
      {whatsAppStudent && (
        <WhatsAppReminderModal
          student={whatsAppStudent}
          onClose={() => setWhatsAppStudent(null)}
        />
      )}

      {/* WhatsApp Broadcast Modal (Batch) */}
      {showBatchWhatsApp && (
        <BatchWhatsAppModal
          students={roster}
          onClose={() => setShowBatchWhatsApp(false)}
        />
      )}
    </div>
  );
}
