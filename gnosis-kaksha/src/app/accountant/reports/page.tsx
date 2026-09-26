'use client';

import { useMemo } from 'react';
import { BarChart3, FileSpreadsheet, Printer } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { useApi } from '@/hooks/useApi';
import { formatINR, type AccountantData } from '@/lib/institute-data';
import toast from 'react-hot-toast';

/** "YYYY-MM" for the current month in IST — matches the server's month bucketing. */
function currentMonthKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
}

function csvCell(value: string | number): string {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export default function AccountantReportsPage() {
  const { data, error, loading, reload } = useApi<AccountantData>('/api/data/accountant');

  const roster = useMemo(() => data?.roster ?? [], [data]);
  const transactions = useMemo(() => data?.transactions ?? [], [data]);
  const activeStudents = useMemo(() => roster.filter((s) => s.status === 'active'), [roster]);

  // Verified payments this month (same rule as the server's collectedThisMonth).
  const verifiedThisMonth = useMemo(() => {
    const month = currentMonthKey();
    return transactions.filter((t) => t.status === 'verified' && (t.verifiedAt ?? t.date).startsWith(month));
  }, [transactions]);

  // Class-wise breakdown, computed from roster + verified transactions.
  const classBreakdown = useMemo(() => {
    const classOf = new Map(roster.map((s) => [s.id, s.classNumber]));
    const map = new Map<number, { count: number; billed: number; collected: number; due: number }>();
    const entryFor = (cls: number) => {
      let entry = map.get(cls);
      if (!entry) {
        entry = { count: 0, billed: 0, collected: 0, due: 0 };
        map.set(cls, entry);
      }
      return entry;
    };

    for (const s of activeStudents) {
      const entry = entryFor(s.classNumber);
      entry.count += 1;
      entry.billed += s.tuitionAfterScholarship;
      if (s.feeState === 'due' && s.amountDue > 0) entry.due += s.amountDue;
    }
    for (const t of verifiedThisMonth) {
      const cls = classOf.get(t.studentId);
      if (cls !== undefined) entryFor(cls).collected += t.amount;
    }

    return [...map.entries()]
      .map(([classNum, d]) => ({
        classNum,
        ...d,
        rate: d.collected + d.due > 0 ? Math.round((d.collected / (d.collected + d.due)) * 100) : 100,
      }))
      .sort((a, b) => a.classNum - b.classNum);
  }, [roster, activeStudents, verifiedThisMonth]);

  if (loading && !data) return <LoadingState label="Loading reports…" />;
  if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return null;

  const { stats, currentPeriod } = data;
  const activeCount = activeStudents.length;
  const billed = activeStudents.reduce((sum, s) => sum + s.tuitionAfterScholarship, 0);
  const collected = stats.collectedThisMonth;
  const outstanding = stats.pendingDues;
  const expected = collected + outstanding;
  const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  const paidCount = activeStudents.filter((s) => s.feeState === 'paid').length;

  const handleExportCSV = () => {
    if (activeStudents.length === 0) {
      toast.error('There are no active students to export.');
      return;
    }
    const headers = ['Registration No', 'Full Name', 'Class', 'Board', 'Tuition', 'Fee State', 'Amount Due', 'Mobile'];
    const rows = activeStudents.map((s) => [
      s.registrationNumber,
      s.fullName,
      s.classNumber,
      s.board,
      s.tuitionAfterScholarship,
      s.feeState,
      s.amountDue,
      s.mobile,
    ]);

    const csvContent = [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Gnosis-Kaksha-Ledger-${currentPeriod.replace(/\s+/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <p className="text-sm text-[#718096]">Monthly Tuition Billed</p>
          <p className="mt-1 text-2xl font-bold text-[#1A2B4A]">{formatINR(billed)}</p>
          <p className="mt-1 text-xs text-[#718096]">{activeCount} active students</p>
        </div>
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Collected This Month</p>
          <p className="mt-1 text-2xl font-bold text-[#10B981]">{formatINR(collected)}</p>
          <p className="mt-1 text-xs text-[#718096]">
            {stats.receiptsThisMonth} receipt{stats.receiptsThisMonth === 1 ? '' : 's'} · {paidCount} student{paidCount === 1 ? '' : 's'} cleared
          </p>
        </div>
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Outstanding Dues</p>
          <p className="mt-1 text-2xl font-bold text-[#F59E0B]">{formatINR(outstanding)}</p>
          <p className="mt-1 text-xs text-[#718096]">{stats.defaulterCount} pending students</p>
        </div>
      </div>

      <SectionCard title="Collection Progress" description={`${collectionRate}% of expected fees (collected + outstanding) received for ${currentPeriod}`}>
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
        {classBreakdown.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={BarChart3}
              title="No active students"
              message="Class-wise figures will appear once students are enrolled."
            />
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                <th className="px-6 py-3">Class</th>
                <th className="px-6 py-3">Students</th>
                <th className="px-6 py-3 text-right">Monthly Tuition</th>
                <th className="px-6 py-3 text-right">Collected (Month)</th>
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
        )}
      </SectionCard>
    </div>
  );
}
