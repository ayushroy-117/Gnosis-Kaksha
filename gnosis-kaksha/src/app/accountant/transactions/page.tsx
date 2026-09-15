'use client';

import { useState, useMemo } from 'react';
import { Receipt, Download, Search, Filter, Printer, X, ShieldCheck } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getAccountantData, formatINR, formatDate, Transaction } from '@/lib/institute-data';

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
      <SampleDataBanner />

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl border border-gray-200 print:fixed print:inset-0 print:m-0 print:p-8 print:border-none print:shadow-none">
            {/* Close button */}
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
              <p className="text-xs font-bold uppercase tracking-wider text-[#1295D8] mt-1">Official Payment Receipt (Duplicate)</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs py-4 border-b border-gray-200">
              <div>
                <span className="text-gray-500">Receipt No:</span>
                <p className="font-mono font-bold text-sm text-[#1A2B4A]">{activeReceipt.id}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Receipt Date:</span>
                <p className="font-semibold text-gray-800">{activeReceipt.date}</p>
              </div>
              <div>
                <span className="text-gray-500">Received From:</span>
                <p className="font-bold text-[#1A2B4A]">{activeReceipt.studentName}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Student ID:</span>
                <p className="font-mono font-semibold text-[#1295D8]">{activeReceipt.studentId}</p>
              </div>
              <div>
                <span className="text-gray-500">Payment Mode:</span>
                <p className="font-semibold text-gray-800">{activeReceipt.method}</p>
              </div>
              <div className="text-right">
                <span className="text-gray-500">Status:</span>
                <p className="font-bold text-green-700">Verified & Reconciled</p>
              </div>
            </div>

            {/* Table */}
            <div className="py-4 border-b border-gray-200">
              <div className="flex justify-between text-xs font-bold text-gray-600 uppercase border-b pb-1">
                <span>Description / Particulars</span>
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
                  <ShieldCheck size={14} /> OFFICIAL COPY
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-500">Total Collected</span>
                <p className="text-2xl font-black text-[#1295D8]">₹{activeReceipt.amount}</p>
              </div>
            </div>

            {/* Signatory Footer */}
            <div className="pt-6 flex justify-between items-end text-[10px] text-gray-500">
              <p>Generated by Accountant Desk · Gnosis Kaksha</p>
              <div className="text-center">
                <div className="w-28 border-b border-gray-400 mb-1" />
                <span>Accountant Seal</span>
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
                <Printer size={16} className="mr-1.5" /> Print Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
