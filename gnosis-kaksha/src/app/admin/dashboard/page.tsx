'use client';

import Link from 'next/link';
import { Users, UserCheck, UserPlus, Wallet, Megaphone, ArrowRight, Clock, KeyRound } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { useApi } from '@/hooks/useApi';
import {
  classLabel,
  formatINR,
  formatDate,
  type AdminData,
} from '@/lib/institute-data';

export default function AdminDashboardPage() {
  const { data, error, loading, reload } = useApi<AdminData>('/api/data/admin');

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading || !data) return <LoadingState label="Loading institute overview…" />;

  const {
    stats,
    classDistribution,
    pendingAdmissions,
    notices,
    currentPeriod,
    pendingPaymentCount,
    accountCounts,
  } = data;
  const totalAccounts = Object.values(accountCounts).reduce((sum, n) => sum + n, 0);
  const maxClassCount = Math.max(1, ...classDistribution.map((c) => c.count));
  const recentNotices = [...notices]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Admin Overview</h1>
        <p className="mt-1 text-[#4A5568]">
          Institute snapshot for {currentPeriod}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={stats.totalStudents}
          sublabel={`Across ${stats.classesOffered} classes`}
        />
        <StatCard
          icon={UserCheck}
          label="Active Enrollments"
          value={stats.activeStudents}
          valueColor="text-[#10B981]"
          iconClasses="bg-green-100 text-green-600"
        />
        <StatCard
          icon={UserPlus}
          label="Pending Admissions"
          value={stats.pendingAdmissions}
          valueColor="text-[#F59E0B]"
          iconClasses="bg-amber-100 text-amber-600"
          sublabel="Awaiting review"
        />
        <StatCard
          icon={Wallet}
          label="Monthly Tuition Billed"
          value={formatINR(stats.monthlyTuitionBilled)}
          sublabel="Active students"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/accountant/collections"
          className="flex items-center gap-4 rounded-[12px] border border-gray-200 bg-white px-5 py-4 shadow-sm transition hover:border-[#1295D8] hover:shadow-md"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Clock size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#718096]">Pending payment verifications</p>
            <p className="text-xl font-bold text-[#1A2B4A]">{pendingPaymentCount}</p>
          </div>
          <ArrowRight size={16} className="shrink-0 text-[#1295D8]" />
        </Link>
        <div className="flex items-center gap-4 rounded-[12px] border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7] text-[#1295D8]">
            <KeyRound size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#718096]">Portal accounts · {totalAccounts}</p>
            <p className="text-sm text-[#4A5568]">
              {accountCounts.admin} admin · {accountCounts.accountant} accountant ·{' '}
              {accountCounts.teacher} teacher · {accountCounts.student} student
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Class distribution */}
        <SectionCard
          title="Students by Class"
          description="Current enrollment distribution"
          className="lg:col-span-2"
        >
          {classDistribution.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No enrolled students"
              message="Class distribution appears once admissions are approved."
            />
          ) : (
          <ul className="space-y-3">
            {classDistribution.map((c) => (
              <li key={c.classNumber} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-sm font-medium text-[#4A5568]">
                  Class {c.classNumber}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#EDF2F7]">
                  <div
                    className="h-full rounded-full bg-[#1295D8]"
                    style={{ width: `${(c.count / maxClassCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-sm font-semibold text-[#1A2B4A]">
                  {c.count}
                </span>
              </li>
            ))}
          </ul>
          )}
        </SectionCard>

        {/* Pending admissions */}
        <SectionCard
          title="Recent Admissions"
          description="New applications to review"
          className="lg:col-span-3"
          bodyClassName="p-0"
          action={
            <Link
              href="/admin/admissions"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#1295D8] hover:underline"
            >
              View all <ArrowRight size={15} />
            </Link>
          }
        >
          {pendingAdmissions.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={UserPlus}
                title="No pending admissions"
                message="New admission applications will appear here for review."
              />
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pendingAdmissions.map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7] text-sm font-semibold text-[#2E5EAA]">
                    {s.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1A2B4A]">
                      {s.fullName}
                    </p>
                    <p className="text-xs text-[#718096]">
                      {classLabel(s)} · {s.board} · Applied {formatDate(s.admissionDate)}
                    </p>
                  </div>
                  <Badge tone="amber">Pending</Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Recent notices */}
      <SectionCard
        title="Recent Notices"
        description="Latest institute announcements"
        bodyClassName="p-0"
        action={
          <Link
            href="/admin/notices"
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#1295D8] hover:underline"
          >
            Manage <ArrowRight size={15} />
          </Link>
        }
      >
        {recentNotices.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Megaphone}
              title="No notices yet"
              message="Announcements you publish will appear here."
            />
          </div>
        ) : (
        <ul className="divide-y divide-gray-100">
          {recentNotices.map((n) => (
            <li key={n.id} className="flex items-start gap-3 px-6 py-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7] text-[#1295D8]">
                <Megaphone size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#1A2B4A]">{n.title}</p>
                  <Badge tone="gray">{n.audience}</Badge>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-[#718096]">{n.content}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap text-xs text-[#718096]">
                {formatDate(n.date)}
              </span>
            </li>
          ))}
        </ul>
        )}
      </SectionCard>
    </div>
  );
}
