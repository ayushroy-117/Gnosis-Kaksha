'use client';

import { useState } from 'react';
import { ClipboardCheck, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  getAllocationRequests,
  resolveAllocationRequest,
  getStudentById,
  getAllTransactions,
  type SubjectAllocationRequest,
} from '@/lib/institute-store';
import { classLabel, formatINR, formatDate } from '@/lib/institute-data';
import toast from 'react-hot-toast';

export default function AccountantAllocationsPage() {
  const [requests, setRequests] = useState<SubjectAllocationRequest[]>(
    getAllocationRequests().filter((r) => r.status === 'PENDING')
  );
  const [resolved, setResolved] = useState<SubjectAllocationRequest[]>(
    getAllocationRequests().filter((r) => r.status !== 'PENDING')
  );
  const [rejectTarget, setRejectTarget] = useState<SubjectAllocationRequest | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const allTransactions = getAllTransactions();

  const handleApprove = async (req: SubjectAllocationRequest) => {
    setIsProcessing(req.id);
    const ok = resolveAllocationRequest(req.id, 'APPROVED');
    if (ok) {
      const updated = { ...req, status: 'APPROVED' as const, resolvedAt: new Date().toISOString().split('T')[0] };
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setResolved((prev) => [updated, ...prev]);
      toast.success(`Approved: ${req.subject} for ${req.studentName}`);
    } else {
      toast.error('Failed to approve request.');
    }
    setIsProcessing(null);
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    if (!rejectionNote.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }
    setIsProcessing(rejectTarget.id);
    const ok = resolveAllocationRequest(rejectTarget.id, 'REJECTED', rejectionNote.trim());
    if (ok) {
      const updated = { ...rejectTarget, status: 'REJECTED' as const, rejectionNote: rejectionNote.trim() };
      setRequests((prev) => prev.filter((r) => r.id !== rejectTarget.id));
      setResolved((prev) => [updated, ...prev]);
      toast.success(`Rejected allocation request.`);
    } else {
      toast.error('Failed to reject request.');
    }
    setIsProcessing(null);
    setRejectTarget(null);
    setRejectionNote('');
  };

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Subject Allocation Queue</h1>
        <p className="mt-1 text-[#4A5568]">
          Review teacher-requested subject allocations. Check payment records before approving.
        </p>
      </div>

      {/* Pending requests */}
      <SectionCard
        title={`Pending Requests (${requests.length})`}
        description="Awaiting your review"
        bodyClassName="p-0"
      >
        {requests.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={ClipboardCheck}
              title="All caught up!"
              message="No pending allocation requests. Teachers' requests will appear here."
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((req) => {
              const student = getStudentById(req.studentId);
              const studentTxns = allTransactions.filter((t) => t.studentId === req.studentId);
              const totalPaid = studentTxns
                .filter((t) => t.status === 'verified')
                .reduce((sum, t) => sum + t.amount, 0);

              return (
                <div key={req.id} className="p-6">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <ClipboardCheck size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-[#1A2B4A]">{req.studentName}</h3>
                          <Badge tone="amber">Pending</Badge>
                          <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {req.registrationNumber}
                          </span>
                        </div>
                        <p className="text-sm text-[#718096]">
                          Requested subject: <strong className="text-[#1A2B4A]">{req.subject}</strong>
                          {' · '}Class {req.classNumber}
                          {' · '}by {req.requestedBy}
                          {' · '}{formatDate(req.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setRejectTarget(req); setRejectionNote(''); }}
                        disabled={isProcessing === req.id}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X size={15} className="mr-1" />
                        Reject
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleApprove(req)}
                        isLoading={isProcessing === req.id}
                        className="bg-[#10B981] hover:bg-[#059669]"
                      >
                        <CheckCircle2 size={15} className="mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>

                  {/* Student payment summary */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 bg-[#F7FAFC] rounded-xl border border-gray-200 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">Current Subjects</p>
                      <p className="mt-0.5 text-sm font-medium text-[#1A2B4A]">
                        {student ? student.subjects.join(', ') : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">Monthly Tuition</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#1A2B4A]">
                        {student ? formatINR(student.tuitionAfterScholarship) : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">Total Paid (Verified)</p>
                      <p className="mt-0.5 text-sm font-semibold text-[#10B981]">{formatINR(totalPaid)}</p>
                    </div>
                  </div>

                  {/* Payment history */}
                  {studentTxns.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#718096] mb-2">Payment History</p>
                      <div className="space-y-1.5">
                        {studentTxns.map((t) => (
                          <div key={t.id} className="flex items-center justify-between text-xs">
                            <span className="text-[#4A5568]">{t.description} · {formatDate(t.date)} · {t.method}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#1A2B4A]">{formatINR(t.amount)}</span>
                              {t.status === 'verified' ? (
                                <Badge tone="green">Verified</Badge>
                              ) : (
                                <Badge tone="amber">Pending</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Resolved */}
      {resolved.length > 0 && (
        <SectionCard title="Resolved Requests" bodyClassName="p-0">
          <ul className="divide-y divide-gray-100">
            {resolved.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1A2B4A]">{r.studentName} — {r.subject}</p>
                  <p className="text-xs text-[#718096]">
                    {r.registrationNumber} · Class {r.classNumber} · {formatDate(r.createdAt)}
                    {r.rejectionNote && ` · Reason: ${r.rejectionNote}`}
                  </p>
                </div>
                {r.status === 'APPROVED' ? (
                  <Badge tone="green">Approved</Badge>
                ) : (
                  <Badge tone="red">Rejected</Badge>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => { setRejectTarget(null); setRejectionNote(''); }}
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 transition"
            >
              <X size={20} />
            </button>
            <div className="mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
                <AlertCircle size={22} />
              </div>
              <h2 className="text-xl font-bold text-[#1A2B4A]">Reject Allocation</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Rejecting <strong>{rejectTarget.subject}</strong> for {rejectTarget.studentName}.
                Please provide a brief reason.
              </p>
            </div>
            <div className="space-y-4">
              <Input
                label="Rejection Reason (required)"
                placeholder="e.g. Subject quota full, fee not cleared..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setRejectTarget(null); setRejectionNote(''); }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleReject}
                  isLoading={isProcessing === rejectTarget.id}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Confirm Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
