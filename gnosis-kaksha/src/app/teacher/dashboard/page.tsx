'use client';

import Link from 'next/link';
import { Users, BookOpen, ArrowRight, ClipboardCheck } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { useApi } from '@/hooks/useApi';
import { classLabel, formatDate, type TeacherData } from '@/lib/institute-data';

export default function TeacherDashboardPage() {
  const { data, error, loading, reload } = useApi<TeacherData>('/api/data/teacher');

  if (loading && !data) return <LoadingState label="Loading overview…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load data.'} onRetry={reload} />;

  const students = data.roster.filter((s) => s.status === 'active');
  const allocations = data.allocations;
  const pending = allocations.filter((a) => a.status === 'PENDING');
  const approved = allocations.filter((a) => a.status === 'APPROVED');

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Teacher Overview</h1>
        <p className="mt-1 text-[#4A5568]">Manage your students and subject allocation requests.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Active Students"
          value={students.length}
          sublabel="Across all classes"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Pending Allocations"
          value={pending.length}
          valueColor="text-[#F59E0B]"
          iconClasses="bg-amber-100 text-amber-600"
          sublabel="Awaiting accountant approval"
        />
        <StatCard
          icon={BookOpen}
          label="Approved Allocations"
          value={approved.length}
          valueColor="text-[#10B981]"
          iconClasses="bg-green-100 text-green-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard
          title="Recent Allocation Requests"
          description="Your latest subject allocation requests"
          bodyClassName="p-0"
          action={
            <Link
              href="/teacher/allocations"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#1295D8] hover:underline"
            >
              View all <ArrowRight size={15} />
            </Link>
          }
        >
          {allocations.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={BookOpen}
                title="No requests yet"
                message="Use the Allocations page to request a subject for a student."
              />
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {allocations.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1A2B4A]">
                      {a.studentName} — {a.subject}
                    </p>
                    <p className="text-xs text-[#718096]">
                      {a.registrationNumber} · Class {a.classNumber} · {formatDate(a.createdAt)}
                    </p>
                  </div>
                  {a.status === 'PENDING' && <Badge tone="amber">Pending</Badge>}
                  {a.status === 'APPROVED' && <Badge tone="green">Approved</Badge>}
                  {a.status === 'REJECTED' && <Badge tone="red">Rejected</Badge>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Student Roster"
          description="Active students overview"
          bodyClassName="p-0"
          action={
            <Link
              href="/teacher/students"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#1295D8] hover:underline"
            >
              View all <ArrowRight size={15} />
            </Link>
          }
        >
          {students.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No active students"
                message="Enrolled students will appear here once admissions are approved."
              />
            </div>
          ) : (
          <ul className="divide-y divide-gray-100">
            {students.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-6 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7] text-xs font-semibold text-[#2E5EAA]">
                  {s.fullName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1A2B4A]">{s.fullName}</p>
                  <p className="text-xs text-[#718096]">{classLabel(s)} · {s.board}</p>
                </div>
                <Badge tone="blue">{s.subjects.length} subj.</Badge>
              </li>
            ))}
          </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
