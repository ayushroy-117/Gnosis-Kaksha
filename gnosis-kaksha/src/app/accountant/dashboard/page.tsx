import Link from 'next/link';
import {
  Wallet,
  Clock,
  Receipt,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { StatCard } from '@/components/dashboard/StatCard';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import {
  getAccountantData,
  classLabel,
  formatINR,
  formatDate,
} from '@/lib/institute-data';

export const metadata = { title: 'Finance Overview - Gnosis Kaksha' };

export default function AccountantDashboardPage() {
  const { stats, transactions, defaulters, currentPeriod } = getAccountantData();
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      <SampleDataBanner />

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
        <StatCard
          icon={Receipt}
          label="Receipts Issued"
          value={stats.receiptsThisMonth}
          sublabel="This month"
        />
        <StatCard
          icon={AlertTriangle}
          label="Defaulters"
          value={stats.defaulterCount}
          valueColor="text-[#EF4444]"
          iconClasses="bg-red-100 text-red-600"
          sublabel="Active, dues pending"
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
                    {t.description} · {formatDate(t.date)} · {t.method}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-[#1A2B4A]">
                  {formatINR(t.amount)}
                </span>
              </li>
            ))}
          </ul>
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
