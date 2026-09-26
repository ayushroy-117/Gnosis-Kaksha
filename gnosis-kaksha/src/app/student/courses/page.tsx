'use client';

import Link from 'next/link';
import { BookOpen, GraduationCap, FileText, Hourglass, XCircle, ArrowRight } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { formatINR } from '@/lib/student-data';
import { useStudentPortal } from '@/hooks/useStudentPortal';

export default function StudentCoursesPage() {
  const { data, error, loading, reload, withAs } = useStudentPortal();

  if (loading && !data) return <LoadingState label="Loading courses…" />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return null;

  const { subjects, profile } = data;
  const totalMonthly = subjects.reduce((sum, s) => sum + s.monthlyFee, 0);

  if (profile.enrollmentStatus !== 'active') {
    const pending = profile.enrollmentStatus === 'pending';
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-[#1A2B4A]">My Courses</h1>
        <div
          className={`flex flex-col gap-4 rounded-[12px] border p-6 sm:flex-row sm:items-start ${
            pending ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
          }`}
        >
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
              pending ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
            }`}
          >
            {pending ? <Hourglass size={22} /> : <XCircle size={22} />}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[#1A2B4A]">
              {pending ? 'Admission under review' : 'Application not approved'}
            </h2>
            <p className="mt-1 text-sm text-[#4A5568]">
              {pending
                ? 'Your admission payment is awaiting verification by the office. Your courses will unlock once it is approved.'
                : 'Your admission application was not approved. Please contact the institute office for details.'}
            </p>
            {pending && (
              <Link
                href={withAs('/student/fees')}
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#1295D8] hover:underline"
              >
                View payment status <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">My Courses</h1>
        <p className="mt-1 text-[#4A5568]">
          Subjects you are enrolled in for Class {profile.classNumber}
          {profile.stream ? ` · ${profile.stream}` : ''}.
        </p>
      </div>

      {subjects.length === 0 ? (
        <SectionCard title="Enrolled Subjects">
          <EmptyState
            icon={BookOpen}
            title="No subjects enrolled yet"
            message="Once your admission is processed, your enrolled subjects will appear here."
          />
        </SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {subjects.map((s) => (
              <div
                key={s.name}
                className="flex flex-col rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#CDE6F7] text-[#1295D8]">
                    <BookOpen size={20} />
                  </div>
                  <span className="rounded-full bg-[#F7FAFC] px-2.5 py-0.5 text-xs font-semibold text-[#4A5568]">
                    {formatINR(s.monthlyFee)}/mo
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#1A2B4A]">{s.name}</h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[#718096]">
                  <GraduationCap size={15} />
                  {s.teacher}
                </p>
                <Link
                  href={withAs(`/student/study-material?subject=${encodeURIComponent(s.name)}`)}
                  className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4 text-sm font-medium text-[#1295D8] hover:underline"
                >
                  <FileText size={15} />
                  Study material
                </Link>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-[12px] border border-gray-200 bg-white px-6 py-4 shadow-sm">
            <p className="text-sm font-medium text-[#4A5568]">
              Total monthly tuition ({subjects.length} subjects)
            </p>
            <p className="text-xl font-bold text-[#1A2B4A]">{formatINR(totalMonthly)}</p>
          </div>
        </>
      )}
    </div>
  );
}
