'use client';

import Link from 'next/link';
import {
  Wallet,
  Clock,
  Receipt,
  ArrowRight,
  CheckCircle2,
  Hourglass,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { useApi } from '@/hooks/useApi';
import {
  classLabel,
  formatINR,
  formatDate,
  receiptLabel,
  type AccountantData,
} from '@/lib/institute-data';

export default function AccountantDashboardPage() {
  const { data, error, loading, reload } = useApi<AccountantData>('/api/data/accountant');

  if (loading && !data) return <LoadingState label="Loading finance overview…" />;
  if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return null;

  const { stats, transactions, defaulters, currentPeriod } = data;
  const recentTransactions = transactions.filter((t) => t.status === 'verified').slice(0, 5);

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Finance Overview</h1>
        <p className="mt-1 text-[#4A5568]">Fee collection summary for {currentPeriod}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Collected This Month"
          value={formatINR(stats.collectedThisMonth)}
          valueColor="text-[#10B981]"
          iconClasses="bg-green-100 text-green-600"
        />
        <StatCard
          icon={Clock}
          label="Pending Dues"
          value={formatINR(stats.pendingDues)}
          valueColor="text-[#F59E0B]"
          iconClasses="bg-amber-100 text-amber-600"
        />
        <Link
          href="/accountant/collections"
          title="Review pending verifications"
          className="block rounded-[12px] transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-[#1295D8]"
        >
          <StatCard
            icon={Hourglass}
            label="Awaiting Verification"
            value={stats.pendingVerificationCount}
            valueColor={stats.pendingVerificationCount > 0 ? 'text-amber-600' : 'text-gray-400'}
            iconClasses={stats.pendingVerificationCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}
            sublabel="Review in Collections →"
          />
        </Link>
        <StatCard
          icon={Receipt}
          label="Receipts Issued"
          value={stats.receiptsThisMonth}
          sublabel="This month"
        />
      </div>


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent transactions */}
        <SectionCard
          title="Recent Transactions"
          description="Latest receipts issued"
          className="lg:col-span-3"
          bodyClassName="p-0"
          action={
            <Link
              href="/accountant/transactions"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#1295D8] hover:underline"
            >
              View all <ArrowRight size={15} />
            </Link>
          }
        >
          {recentTransactions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Receipt}
                title="No receipts yet"
                message="Verified payments will appear here."
              />
            </div>
          ) : (
          <ul className="divide-y divide-gray-100">
            {recentTransactions.map((t) => (
              <li key={t.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle2 size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1A2B4A]">
                    {t.studentName}
                  </p>
                  <p className="truncate text-xs text-[#718096]">
                    <span className="font-mono">{receiptLabel(t)}</span> · {t.description} · {formatDate(t.date)} · {t.method}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[#1A2B4A]">
                  {formatINR(t.amount)}
                </span>
              </li>
            ))}
          </ul>
          )}
        </SectionCard>

        {/* Defaulters */}
        <SectionCard
          title="Pending Dues"
          description="Students with outstanding fees"
          className="lg:col-span-2"
          bodyClassName="p-0"
          action={
            <Link
              href="/accountant/collections"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#1295D8] hover:underline"
            >
              Collect <ArrowRight size={15} />
            </Link>
          }
        >
          {defaulters.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CheckCircle2}
                title="All dues cleared"
                message="No outstanding fees for this cycle."
              />
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {defaulters.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-6 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                    {s.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1A2B4A]">
                      {s.fullName}
                    </p>
                    <p className="text-xs text-[#718096]">{classLabel(s)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-[#F59E0B]">
                    {formatINR(s.amountDue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
