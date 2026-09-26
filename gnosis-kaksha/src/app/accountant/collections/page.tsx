'use client';

import { useMemo, useState } from 'react';
import {
  Wallet,
  IndianRupee,
  CheckCircle2,
  X,
  MessageSquare,
  Send,
  Hourglass,
  ShieldCheck,
  XCircle,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { WhatsAppReminderModal } from '@/components/dashboard/WhatsAppReminderModal';
import { BatchWhatsAppModal } from '@/components/dashboard/BatchWhatsAppModal';
import { OfficialFeeReceiptModal } from '@/components/dashboard/OfficialFeeReceiptModal';
import { apiFetch, useApi } from '@/hooks/useApi';
import {
  classLabel,
  formatINR,
  receiptLabel,
  type AccountantData,
  type RosterStudent,
  type Transaction,
} from '@/lib/institute-data';
import { formatDate } from '@/lib/format';
import toast from 'react-hot-toast';

type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer';

export default function AccountantCollectionsPage() {
  const { data, error, loading, reload } = useApi<AccountantData>('/api/data/accountant');

  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);
  const [whatsAppStudent, setWhatsAppStudent] = useState<RosterStudent | null>(null);
  const [showBatchWhatsApp, setShowBatchWhatsApp] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [utrNumber, setUtrNumber] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<Transaction | null>(null);
  const [rejectedNote, setRejectedNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Receipt preview after approval
  const [approvedReceipt, setApprovedReceipt] = useState<Transaction | null>(null);

  const roster = useMemo(() => data?.roster ?? [], [data]);
  const byId = useMemo(() => new Map(roster.map((s) => [s.id, s])), [roster]);
  const pendingVerifications = data?.pendingVerifications ?? [];

  const active = useMemo(
    () =>
      roster
        .filter((s) => s.status === 'active')
        .sort((a, b) => {
          const order = (f: string) => (f === 'due' ? 0 : f === 'pending_verification' ? 1 : 2);
          if (a.feeState !== b.feeState) return order(a.feeState) - order(b.feeState);
          return a.fullName.localeCompare(b.fullName);
        }),
    [roster]
  );

  if (loading && !data) return <LoadingState label="Loading collections…" />;
  if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return null;

  const { stats } = data;

  // ── Accountant records a payment taken at the counter ────────────────────
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsRecording(true);
    try {
      const res = await apiFetch<{ transaction: Transaction }>('/api/admin/transactions', {
        method: 'POST',
        json: {
          studentId: selectedStudent.id,
          amount: selectedStudent.amountDue,
          method: paymentMethod,
          utr: paymentMethod === 'Cash' ? undefined : utrNumber,
        },
      });
      toast.success(`Payment recorded for ${selectedStudent.fullName}. Receipt ${receiptLabel(res.transaction)}.`);
      setSelectedStudent(null);
      setUtrNumber('');
      setPaymentMethod('Cash');
      setApprovedReceipt(res.transaction);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not record the payment.');
    } finally {
      setIsRecording(false);
    }
  };

  // ── Approve a pending student UPI payment ────────────────────────────────
  const handleApprove = async (txn: Transaction) => {
    const ok = window.confirm(
      `Approve ${formatINR(txn.amount)} from ${txn.studentName}?\n\n` +
        `Only approve if UPI transaction ID ${txn.utr ?? '—'} appears in the bank/UPI statement for this amount.` +
        (txn.purpose === 'admission' ? '\n\nThis also completes the student’s admission.' : '')
    );
    if (!ok) return;

    setApprovingId(txn.id);
    try {
      const res = await apiFetch<{ transaction: Transaction; message: string }>('/api/accountant/verify-payment', {
        method: 'POST',
        json: { transactionId: txn.id, action: 'approve' },
      });
      toast.success(res.message);
      setApprovedReceipt(res.transaction);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed.');
      reload();
    } finally {
      setApprovingId(null);
    }
  };

  // ── Reject a pending student UPI payment ─────────────────────────────────
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/accountant/verify-payment', {
        method: 'POST',
        json: { transactionId: rejectTarget.id, action: 'reject', rejectedNote },
      });
      toast.success(res.message);
      setRejectTarget(null);
      setRejectedNote('');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setIsRejecting(false);
    }
  };

  const receiptStudent = approvedReceipt ? byId.get(approvedReceipt.studentId) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Collections</h1>
        <p className="mt-1 text-[#4A5568]">
          Fee ledger for {data.currentPeriod}. Verify student UPI payments, record counter collections, and track dues.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Collected this month</p>
          <p className="mt-1 text-2xl font-bold text-[#10B981]">{formatINR(stats.collectedThisMonth)}</p>
          <p className="mt-0.5 text-xs text-[#718096]">{stats.receiptsThisMonth} verified receipt{stats.receiptsThisMonth === 1 ? '' : 's'}</p>
        </div>
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[#718096]">Outstanding dues</p>
            <p className="mt-1 text-2xl font-bold text-[#F59E0B]">{formatINR(stats.pendingDues)}</p>
          </div>
          {stats.pendingDues > 0 && (
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
            pendingVerifications.length > 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
          }`}
        >
          <Hourglass size={22} className={pendingVerifications.length > 0 ? 'text-amber-500' : 'text-gray-400'} />
          <div>
            <p className="text-sm text-[#718096]">Pending UPI Verifications</p>
            <p className={`mt-0.5 text-2xl font-bold ${pendingVerifications.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {pendingVerifications.length}
            </p>
          </div>
        </div>
      </div>

      {/* ── PENDING UPI VERIFICATIONS QUEUE ─────────────────────────────── */}
      <SectionCard
        title={`Pending UPI Verifications (${pendingVerifications.length})`}
        description="Oldest first. Check each transaction ID against your bank/UPI statement before approving."
        bodyClassName="p-0"
      >
        {pendingVerifications.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Inbox} title="Queue is clear" message="New UPI submissions from students and applicants will appear here." />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">For</th>
                    <th className="px-6 py-3">Submitted</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3">UPI Transaction ID</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingVerifications.map((txn) => {
                    const stu = byId.get(txn.studentId);
                    const busy = approvingId === txn.id;
                    return (
                      <tr key={txn.id} className="hover:bg-amber-50/60 transition">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-[#1A2B4A]">{txn.studentName}</p>
                          <p className="text-xs font-mono text-[#718096]">{stu?.registrationNumber ?? txn.registrationNumber ?? '—'}</p>
                          {stu && <p className="text-xs text-[#718096]">{classLabel(stu)}</p>}
                        </td>
                        <td className="px-6 py-4">
                          {txn.purpose === 'admission' ? (
                            <Badge tone="blue">New admission</Badge>
                          ) : (
                            <Badge tone="gray">Tuition</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-[#4A5568]">{formatDate(txn.date)}</td>
                        <td className="px-6 py-4 text-right font-bold text-[#1A2B4A]">{formatINR(txn.amount)}</td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-semibold text-[#1A2B4A] bg-gray-100 px-2 py-0.5 rounded">
                            {txn.utr || '—'}
                          </span>
                          {txn.upiReference && (
                            <p className="mt-1 font-mono text-[11px] text-[#718096]">Ref {txn.upiReference}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(txn)}
                              disabled={approvingId !== null}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition shadow-xs"
                            >
                              {busy ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                <ShieldCheck size={13} />
                              )}
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => { setRejectTarget(txn); setRejectedNote(''); }}
                              disabled={approvingId !== null}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition shadow-xs"
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
                There is no automatic bank check — approval is your confirmation that the money arrived. Approving issues
                the official receipt, clears the dues and, for a new admission, activates the student.
              </p>
            </div>
          </>
        )}
      </SectionCard>

      {/* ── STUDENT TUITION LEDGER ────────────────────────────────────────── */}
      {active.length === 0 ? (
        <EmptyState icon={Wallet} title="No active students" message="Fee ledgers appear here once students are enrolled." />
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
                      <p className="font-semibold text-[#1A2B4A]">{s.fullName}</p>
                      <p className="text-xs font-mono text-[#718096]">{s.registrationNumber}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#4A5568]">{classLabel(s)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-[#1A2B4A]">{formatINR(s.tuitionAfterScholarship)}</td>
                    <td className="px-6 py-4">
                      {s.feeState === 'paid' ? (
                        <Badge tone="green">Paid</Badge>
                      ) : s.feeState === 'pending_verification' ? (
                        <Badge tone="amber">Pending Verification</Badge>
                      ) : (
                        <Badge tone="red">Due · {formatINR(s.amountDue)}</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.feeState === 'due' && s.amountDue > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setWhatsAppStudent(s)}
                            disabled={!s.mobile}
                            title={s.mobile ? 'Send WhatsApp payment reminder' : 'No mobile number on file'}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-2.5 py-1.5 text-xs font-semibold text-white transition shadow-xs"
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

      {/* ── RECORD COUNTER PAYMENT MODAL ────────────────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="record-title" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setSelectedStudent(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            >
              <X size={20} />
            </button>

            <div className="mb-4 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2E5EAA] bg-[#CDE6F7] px-2.5 py-0.5 rounded-full">
                Counter Collection
              </span>
              <h2 id="record-title" className="text-xl font-bold text-[#1A2B4A] mt-1">Record Fee Payment</h2>
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
                  { value: 'Cash', label: 'Cash (paid at the counter)' },
                  { value: 'UPI', label: 'UPI (paid in front of you)' },
                  { value: 'Bank Transfer', label: 'Bank Transfer' },
                ]}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              />

              {paymentMethod !== 'Cash' && (
                <Input
                  label="Transaction ID / UTR"
                  placeholder="e.g. 581920491823"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  required
                />
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setSelectedStudent(null)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isRecording} className="flex-1 bg-[#10B981] hover:bg-[#059669]">
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
          <div role="dialog" aria-modal="true" aria-labelledby="reject-title" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <button
              type="button"
              aria-label="Close"
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
              <h2 id="reject-title" className="text-xl font-bold text-[#1A2B4A]">Reject Payment</h2>
              <p className="mt-1 text-xs text-gray-500">
                {rejectTarget.studentName} · {formatINR(rejectTarget.amount)} · UTR {rejectTarget.utr}
              </p>
            </div>

            <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 mb-4 text-xs text-red-700">
              The student will see your reason on their Fees page and can submit a corrected transaction ID.
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <Input
                label="Reason for Rejection"
                placeholder="e.g. UTR not found in bank statement, amount mismatch..."
                value={rejectedNote}
                onChange={(e) => setRejectedNote(e.target.value)}
                minLength={3}
                required
              />
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setRejectTarget(null)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isRejecting} className="flex-1 bg-red-500 hover:bg-red-600">
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RECEIPT MODAL (after approval / counter payment) ─────────────── */}
      {approvedReceipt && (
        <OfficialFeeReceiptModal
          receipt={{ ...approvedReceipt, id: receiptLabel(approvedReceipt) }}
          student={{
            fullName: approvedReceipt.studentName,
            registrationNumber: receiptStudent?.registrationNumber || approvedReceipt.registrationNumber || '—',
            classNumber: receiptStudent?.classNumber,
            stream: receiptStudent?.stream,
            parentName: receiptStudent?.parentName,
            mobile: receiptStudent?.mobile,
            address: receiptStudent?.address,
          }}
          onClose={() => setApprovedReceipt(null)}
          copyType="OFFICE COPY"
        />
      )}

      {whatsAppStudent && <WhatsAppReminderModal student={whatsAppStudent} onClose={() => setWhatsAppStudent(null)} />}

      {showBatchWhatsApp && <BatchWhatsAppModal students={roster} onClose={() => setShowBatchWhatsApp(false)} />}
    </div>
  );
}
