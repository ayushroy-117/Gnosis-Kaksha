import Link from 'next/link';
import {
  BookOpen,
  Wallet,
  CalendarClock,
  Award,
  ArrowRight,
  Pin,
  User,
  Paperclip,
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { getStudentData, formatINR, formatDate } from '@/lib/student-data';

export const metadata = { title: 'Student Dashboard - Gnosis Kaksha' };

export default function StudentDashboardPage() {
  const { profile, subjects, feeStatus, notices } = getStudentData();
  const firstName = profile.fullName.split(' ')[0];
  const recentNotices = [...notices]
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
    .slice(0, 3);

  return (
    <div className="space-y-6">

      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Welcome back, {firstName} 👋</h1>
        <p className="mt-1 text-[#4A5568]">
          Class {profile.classNumber}
          {profile.stream ? ` · ${profile.stream}` : ''} · {profile.board} · Reg.{' '}
          {profile.registrationNumber}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Enrolled Subjects"
          value={subjects.length}
          sublabel="This session"
        />
        <StatCard
          icon={Wallet}
          label="Monthly Tuition"
          value={formatINR(feeStatus.tuitionAfterScholarship)}
          sublabel="After scholarship"
        />
        <StatCard
          icon={CalendarClock}
          label="Next Due"
          value={formatINR(feeStatus.finalPayable)}
          sublabel={`Due ${formatDate(feeStatus.nextDueDate)}`}
          valueColor="text-[#F59E0B]"
          iconClasses="bg-amber-100 text-amber-600"
        />
        <StatCard
          icon={Award}
          label="Scholarship"
          value={`${feeStatus.scholarshipPercent}%`}
          sublabel="Merit-based discount"
          valueColor="text-[#10B981]"
          iconClasses="bg-green-100 text-green-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Fee status */}
        <SectionCard
          title="Fee Status"
          description="Current billing summary"
          className="lg:col-span-2"
          action={
            <Link
              href="/student/fees"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#1295D8] hover:underline"
            >
              Details <ArrowRight size={15} />
            </Link>
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#718096]">Amount payable</p>
              <p className="mt-1 text-3xl font-bold text-[#1A2B4A]">
                {formatINR(feeStatus.finalPayable)}
              </p>
              <p className="mt-1 text-sm text-[#718096]">
                Due by {formatDate(feeStatus.nextDueDate)}
              </p>
            </div>
            <Badge tone={feeStatus.status === 'paid' ? 'green' : 'amber'}>
              {feeStatus.status === 'paid' ? 'Paid' : 'Payment due'}
            </Badge>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-100 pt-5 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-[#718096]">Tuition</dt>
              <dd className="mt-0.5 font-semibold text-[#1A2B4A]">
                {formatINR(feeStatus.monthlyTuition)}
              </dd>
            </div>
            <div>
              <dt className="text-[#718096]">Scholarship</dt>
              <dd className="mt-0.5 font-semibold text-[#10B981]">
                −{formatINR(feeStatus.scholarshipAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-[#718096]">Charges</dt>
              <dd className="mt-0.5 font-semibold text-[#1A2B4A]">
                {formatINR(feeStatus.mandatoryCharges)}
              </dd>
            </div>
            <div>
              <dt className="text-[#718096]">Payable</dt>
              <dd className="mt-0.5 font-semibold text-[#1A2B4A]">
                {formatINR(feeStatus.finalPayable)}
              </dd>
            </div>
          </dl>
        </SectionCard>

        {/* Profile quick card */}
        <SectionCard
          title="My Profile"
          action={
            <Link
              href="/student/profile"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#1295D8] hover:underline"
            >
              View <ArrowRight size={15} />
            </Link>
          }
        >
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7] text-[#1295D8]">
              <User size={28} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#1A2B4A]">
                {profile.fullName}
              </p>
              <p className="text-sm text-[#718096]">{profile.registrationNumber}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#718096]">Class</dt>
              <dd className="font-medium text-[#1A2B4A]">
                {profile.classNumber}
                {profile.stream ? ` · ${profile.stream}` : ''}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#718096]">Parent</dt>
              <dd className="font-medium text-[#1A2B4A]">{profile.parentName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#718096]">Mobile</dt>
              <dd className="font-medium text-[#1A2B4A]">{profile.mobile}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Courses */}
        <SectionCard
          title="My Courses"
          description={`${subjects.length} subjects enrolled`}
          className="lg:col-span-2"
          action={
            <Link
              href="/student/courses"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#1295D8] hover:underline"
            >
              All courses <ArrowRight size={15} />
            </Link>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-gray-100">
            {subjects.map((s) => (
              <li
                key={s.name}
                className="flex items-center justify-between gap-4 px-6 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#CDE6F7] text-[#1295D8]">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A2B4A]">{s.name}</p>
                    <p className="text-xs text-[#718096]">{s.teacher}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-[#4A5568]">
                  {formatINR(s.monthlyFee)}/mo
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        {/* Notices */}
        <SectionCard
          title="Recent Notices"
          action={
            <Link
              href="/student/notices"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#1295D8] hover:underline"
            >
              All <ArrowRight size={15} />
            </Link>
          }
        >
          <ul className="space-y-4">
            {recentNotices.map((n) => (
              <li key={n.id} className="border-l-2 border-[#1295D8] pl-3">
                <div className="flex items-center gap-2">
                  {n.pinned && <Pin size={13} className="text-[#1295D8]" />}
                  <p className="text-sm font-semibold text-[#1A2B4A]">{n.title}</p>
                  {n.attachmentUrl && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-[#1295D8] bg-blue-50 px-1.5 py-0.5 rounded font-medium ml-auto">
                      <Paperclip size={10} /> Attached
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-[#718096]">{n.content}</p>
                <p className="mt-1 text-xs text-[#718096]">{formatDate(n.date)}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
