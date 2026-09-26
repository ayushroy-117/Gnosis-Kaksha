'use client';

import { useState, useMemo } from 'react';
import { Receipt, Download, Search, Filter } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { useApi } from '@/hooks/useApi';
import {
  formatINR,
  formatDate,
  receiptLabel,
  type AccountantData,
  type Transaction,
  type TransactionStatus,
} from '@/lib/institute-data';
import { OfficialFeeReceiptModal } from '@/components/dashboard/OfficialFeeReceiptModal';

type StatusFilter = 'All' | 'Verified' | 'Pending' | 'Rejected';
const STATUS_FILTER_MAP: Record<Exclude<StatusFilter, 'All'>, TransactionStatus[]> = {
  Verified: ['verified'],
  Pending: ['pending'],
  Rejected: ['rejected', 'failed'],
};

const STATUS_BADGE: Record<TransactionStatus, { tone: 'green' | 'amber' | 'red' | 'gray'; label: string }> = {
  verified: { tone: 'green', label: 'Verified' },
  pending: { tone: 'amber', label: 'Pending' },
  rejected: { tone: 'red', label: 'Rejected' },
  failed: { tone: 'gray', label: 'Failed' },
};

export default function AccountantTransactionsPage() {
  const { data, error, loading, reload } = useApi<AccountantData>('/api/data/accountant');
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'All' | 'UPI' | 'Cash'>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  const transactions = useMemo(() => data?.transactions ?? [], [data]);
  const rosterById = useMemo(() => new Map((data?.roster ?? []).map((s) => [s.id, s])), [data]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesSearch =
        !q ||
        [t.studentName, receiptLabel(t), t.id, t.registrationNumber, t.description, t.utr, t.upiReference].some((v) =>
          v?.toLowerCase().includes(q)
        );
      const matchesMethod = methodFilter === 'All' || t.method === methodFilter;
      const matchesStatus = statusFilter === 'All' || STATUS_FILTER_MAP[statusFilter].includes(t.status);
      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [transactions, searchTerm, methodFilter, statusFilter]);

  if (loading && !data) return <LoadingState label="Loading transactions…" />;
  if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;

  const verifiedTotal = filtered.filter((t) => t.status === 'verified').reduce((sum, t) => sum + t.amount, 0);
  const activeStudent = activeReceipt ? rosterById.get(activeReceipt.studentId) : undefined;

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Transactions Ledger</h1>
          <p className="mt-1 text-[#4A5568]">
            Search payments, check verification status, and print duplicate receipts for verified payments.
            Verified total (shown): {formatINR(verifiedTotal)}.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student, reg. no, receipt number, or UTR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-[#1295D8]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-600 uppercase">Method:</span>
          {(['All', 'UPI', 'Cash'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethodFilter(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                methodFilter === m
                  ? 'bg-[#1295D8] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 uppercase">Status:</span>
          {(['All', 'Verified', 'Pending', 'Rejected'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-[#1295D8] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions found"
          message={
            transactions.length === 0
              ? 'No payments have been recorded yet.'
              : 'No records match your search or filter criteria.'
          }
        />
      ) : (
        <SectionCard title={`Transactions (${filtered.length})`} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-6 py-3">Receipt No.</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Official Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => {
                  const badge = STATUS_BADGE[t.status] ?? { tone: 'gray' as const, label: t.status };
                  return (
                    <tr key={t.id} className="hover:bg-[#F7FAFC] transition">
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-[#1A2B4A]">
                        {receiptLabel(t)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-[#4A5568]">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-[#1A2B4A]">{t.studentName}</p>
                        <p className="font-mono text-xs text-[#718096]">{t.registrationNumber || '—'}</p>
                      </td>
                      <td className="px-6 py-4 text-[#4A5568] max-w-xs truncate">{t.description}</td>
                      <td className="px-6 py-4">
                        <Badge tone={t.method === 'UPI' ? 'blue' : 'green'}>{t.method}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                        {t.status === 'rejected' && t.rejectedNote && (
                          <p className="mt-1 max-w-[220px] text-xs text-red-600">{t.rejectedNote}</p>
                        )}
                        {t.verifiedBy && (
                          <p className="mt-1 text-xs text-[#718096]">
                            by {t.verifiedBy}
                            {t.verifiedAt ? ` · ${formatDate(t.verifiedAt)}` : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-[#1A2B4A]">
                        {formatINR(t.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {t.status === 'verified' ? (
                          <button
                            type="button"
                            onClick={() => setActiveReceipt(t)}
                            title="View official receipt"
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-[#1295D8] border border-[#CDE6F7] hover:bg-[#CDE6F7] transition"
                          >
                            <Download size={14} /> Receipt
                          </button>
                        ) : (
                          <span className="text-xs text-[#A0AEC0]" title="Receipts are issued only for verified payments">
                            Not issued
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* OFFICIAL PRINTABLE FEE RECEIPT MODAL (verified payments only) */}
      {activeReceipt && activeReceipt.status === 'verified' && (
        <OfficialFeeReceiptModal
          receipt={activeReceipt}
          student={{
            fullName: activeReceipt.studentName,
            registrationNumber: activeReceipt.registrationNumber || activeStudent?.registrationNumber || '—',
            classNumber: activeStudent?.classNumber,
            stream: activeStudent?.stream,
            board: activeStudent?.board,
            parentName: activeStudent?.parentName,
            mobile: activeStudent?.mobile,
            address: activeStudent?.address,
          }}
          onClose={() => setActiveReceipt(null)}
          copyType="OFFICE COPY"
        />
      )}
    </div>
  );
}
