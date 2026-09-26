import Link from 'next/link';
import { Users, UserCheck, UserPlus, Wallet, Megaphone, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import {
  getAdminData,
  classLabel,
  formatINR,
  formatDate,
} from '@/lib/institute-data';

export const metadata = { title: 'Admin Overview - Gnosis Kaksha' };

export default function AdminDashboardPage() {
  const { stats, classDistribution, pendingAdmissions, notices, currentPeriod } =
    getAdminData();
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Class distribution */}
        <SectionCard
          title="Students by Class"
          description="Current enrollment distribution"
          className="lg:col-span-2"
        >
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
      </SectionCard>
    </div>
  );
}
