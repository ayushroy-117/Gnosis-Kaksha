'use client';

import { useState, useMemo } from 'react';
import { Receipt, Download, Search, Filter, Printer, X, ShieldCheck } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getAccountantData, formatINR, formatDate, Transaction } from '@/lib/institute-data';
import { getStudentById, getStudentByRegNo } from '@/lib/institute-store';
import { OfficialFeeReceiptModal } from '@/components/dashboard/OfficialFeeReceiptModal';

export default function AccountantTransactionsPage() {
  const { transactions } = getAccountantData();
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'All' | 'UPI' | 'Cash'>('All');
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        t.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMethod = methodFilter === 'All' || t.method === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [transactions, searchTerm, methodFilter]);

  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Transactions Ledger</h1>
          <p className="mt-1 text-[#4A5568]">
            Search receipts, verify UPI and cash collections, and print duplicate receipts. Total: {formatINR(total)}.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, receipt number, or UTR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-[#1295D8]"
          />
        </div>

        <div className="flex items-center gap-2">
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
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions found"
          message="No records match your search or filter criteria."
        />
      ) : (
        <SectionCard title={`Receipts (${filtered.length})`} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-6 py-3">Receipt No.</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Official Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F7FAFC] transition">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-[#1A2B4A]">
                      {t.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#4A5568]">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#1A2B4A]">
                      {t.studentName}
                    </td>
                    <td className="px-6 py-4 text-[#4A5568] max-w-xs truncate">{t.description}</td>
                    <td className="px-6 py-4">
                      <Badge tone={t.method === 'UPI' ? 'blue' : 'green'}>{t.method}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-[#1A2B4A]">
                      {formatINR(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveReceipt(t)}
                        title="View official receipt"
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-[#1295D8] border border-[#CDE6F7] hover:bg-[#CDE6F7] transition"
                      >
                        <Download size={14} /> Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* OFFICIAL PRINTABLE FEE RECEIPT MODAL */}
      {activeReceipt && (
        <OfficialFeeReceiptModal
          receipt={activeReceipt}
          student={(() => {
            const stu = getStudentById(activeReceipt.studentId) || getStudentByRegNo(activeReceipt.studentId);
            return {
              fullName: activeReceipt.studentName,
              registrationNumber: stu?.registrationNumber || activeReceipt.studentId,
              classNumber: stu?.classNumber || 10,
              stream: stu?.stream,
              parentName: stu?.parentName,
              mobile: stu?.mobile,
              address: stu?.address,
            };
          })()}
          onClose={() => setActiveReceipt(null)}
          copyType="OFFICE COPY"
        />
      )}
    </div>
  );
}
