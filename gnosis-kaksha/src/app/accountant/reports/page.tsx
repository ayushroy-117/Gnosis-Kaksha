'use client';

import { useMemo } from 'react';
import { BarChart3, FileSpreadsheet, Printer, Users, TrendingUp, DollarSign } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { getAccountantData, formatINR } from '@/lib/institute-data';
import toast from 'react-hot-toast';

export default function AccountantReportsPage() {
  const { roster, stats, currentPeriod } = getAccountantData();

  const activeStudents = useMemo(() => roster.filter((s) => s.status === 'active'), [roster]);
  const activeCount = activeStudents.length;
  const collected = stats.collectedThisMonth;
  const outstanding = stats.pendingDues;
  const billed = collected + outstanding;
  const collectionRate = billed > 0 ? Math.round((collected / billed) * 100) : 0;
  const paidCount = activeCount - stats.defaulterCount;

  // Class-wise breakdown
  const classBreakdown = useMemo(() => {
    const map = new Map<number, { count: number; billed: number; collected: number; due: number }>();

    for (const s of activeStudents) {
      const entry = map.get(s.classNumber) || { count: 0, billed: 0, collected: 0, due: 0 };
      entry.count += 1;
      entry.billed += s.tuitionAfterScholarship;
      if (s.feeState === 'paid') {
        entry.collected += s.tuitionAfterScholarship;
      } else {
        entry.due += s.amountDue;
      }
      map.set(s.classNumber, entry);
    }

    return [...map.entries()]
      .map(([classNum, data]) => ({
        classNum,
        ...data,
        rate: data.billed > 0 ? Math.round((data.collected / data.billed) * 100) : 0,
      }))
      .sort((a, b) => a.classNum - b.classNum);
  }, [activeStudents]);

  const handleExportCSV = () => {
    const headers = ['Registration No', 'Full Name', 'Class', 'Board', 'Tuition', 'Fee State', 'Amount Due', 'Mobile'];
    const rows = activeStudents.map((s) => [
      s.registrationNumber,
      `"${s.fullName}"`,
      s.classNumber,
      s.board,
      s.tuitionAfterScholarship,
      s.feeState,
      s.amountDue,
      s.mobile,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Gnosis-Kaksha-Ledger-${currentPeriod.replace(/\s+/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV ledger exported successfully!');
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Financial Reports</h1>
          <p className="mt-1 text-[#4A5568]">
            Collection summary and revenue analytics for {currentPeriod}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 px-3.5 py-2 text-sm font-semibold text-[#1A2B4A] shadow-xs transition"
          >
            <FileSpreadsheet size={16} className="text-green-600" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1295D8] hover:bg-[#2E5EAA] px-3.5 py-2 text-sm font-semibold text-white shadow-xs transition"
          >
            <Printer size={16} /> Print / Save PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Tuition Billed</p>
          <p className="mt-1 text-2xl font-bold text-[#1A2B4A]">{formatINR(billed)}</p>
          <p className="mt-1 text-xs text-[#718096]">{activeCount} active students</p>
        </div>
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Collected This Month</p>
          <p className="mt-1 text-2xl font-bold text-[#10B981]">{formatINR(collected)}</p>
          <p className="mt-1 text-xs text-[#718096]">{paidCount} cleared</p>
        </div>
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Outstanding Dues</p>
          <p className="mt-1 text-2xl font-bold text-[#F59E0B]">{formatINR(outstanding)}</p>
          <p className="mt-1 text-xs text-[#718096]">{stats.defaulterCount} pending students</p>
        </div>
      </div>

      <SectionCard title="Collection Progress" description={`${collectionRate}% of billed tuition collected for ${currentPeriod}`}>
        <div className="space-y-4">
          <div className="h-4 w-full overflow-hidden rounded-full bg-[#EDF2F7]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1295D8] to-[#50B4F2] transition-all duration-500"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#1295D8]" />
              <span className="text-[#4A5568]">
                Collected — <span className="font-semibold text-[#1A2B4A]">{formatINR(collected)}</span> ({collectionRate}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#EDF2F7] ring-1 ring-inset ring-gray-300" />
              <span className="text-[#4A5568]">
                Outstanding — <span className="font-semibold text-[#1A2B4A]">{formatINR(outstanding)}</span> ({100 - collectionRate}%)
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Class-wise Revenue Breakdown Table */}
      <SectionCard title="Class-Wise Tuition Breakdown" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                <th className="px-6 py-3">Class</th>
                <th className="px-6 py-3">Students</th>
                <th className="px-6 py-3 text-right">Total Billed</th>
                <th className="px-6 py-3 text-right">Collected</th>
                <th className="px-6 py-3 text-right">Dues Pending</th>
                <th className="px-6 py-3 text-right">Recovery Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classBreakdown.map((c) => (
                <tr key={c.classNum} className="hover:bg-[#F7FAFC]">
                  <td className="px-6 py-3 font-semibold text-[#1A2B4A]">
                    Class {c.classNum}
                  </td>
                  <td className="px-6 py-3 text-[#4A5568]">
                    {c.count} student{c.count === 1 ? '' : 's'}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-[#1A2B4A]">
                    {formatINR(c.billed)}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-[#10B981]">
                    {formatINR(c.collected)}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-[#F59E0B]">
                    {formatINR(c.due)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      c.rate >= 80 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {c.rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
