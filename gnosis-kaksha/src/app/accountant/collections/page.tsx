'use client';

import { useState } from 'react';
import { Wallet, IndianRupee, CheckCircle2, X, CreditCard, Banknote, MessageSquare, Send } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { WhatsAppReminderModal } from '@/components/dashboard/WhatsAppReminderModal';
import { BatchWhatsAppModal } from '@/components/dashboard/BatchWhatsAppModal';
import {
  getAccountantData,
  classLabel,
  formatINR,
  RosterStudent,
} from '@/lib/institute-data';
import toast from 'react-hot-toast';

export default function AccountantCollectionsPage() {
  const initialData = getAccountantData();
  const [roster, setRoster] = useState<RosterStudent[]>(initialData.roster);
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);
  const [whatsAppStudent, setWhatsAppStudent] = useState<RosterStudent | null>(null);
  const [showBatchWhatsApp, setShowBatchWhatsApp] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
  const [utrNumber, setUtrNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fee ledger covers enrolled (active) students for the current cycle.
  const active = roster
    .filter((s) => s.status === 'active')
    .sort((a, b) => {
      if (a.feeState !== b.feeState) return a.feeState === 'due' ? -1 : 1;
      return a.fullName.localeCompare(b.fullName);
    });

  const collectedThisMonth = roster
    .filter((s) => s.status === 'active' && s.feeState === 'paid')
    .reduce((sum, s) => sum + s.tuitionAfterScholarship, 0);

  const pendingDues = roster
    .filter((s) => s.status === 'active' && s.feeState === 'due')
    .reduce((sum, s) => sum + s.amountDue, 0);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    if (paymentMethod === 'UPI' && (!utrNumber || utrNumber.trim().length < 6)) {
      toast.error('Please enter a valid UPI Transaction / UTR number');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/student/pay-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          identifier: selectedStudent.registrationNumber,
          amount: selectedStudent.amountDue,
          method: paymentMethod,
          utr: paymentMethod === 'UPI' ? utrNumber.trim() : `CASH-${Date.now().toString().slice(-6)}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Fee payment recorded for ${selectedStudent.fullName}!`);
        // Update local roster
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

  return (
    <div className="space-y-6">
      <SampleDataBanner />

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Collections</h1>
        <p className="mt-1 text-[#4A5568]">
          Fee ledger for {initialData.currentPeriod}. Record offline or UPI collections and track student dues.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Collected this month</p>
          <p className="mt-1 text-2xl font-bold text-[#10B981]">
            {formatINR(collectedThisMonth)}
          </p>
        </div>
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[#718096]">Outstanding dues</p>
            <p className="mt-1 text-2xl font-bold text-[#F59E0B]">
              {formatINR(pendingDues)}
            </p>
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
      </div>

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

      {/* RECORD PAYMENT MODAL */}
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
              <p className="text-xs text-gray-500">{selectedStudent.fullName} ({selectedStudent.registrationNumber})</p>
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
                  Confirm & Clear Due
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
