import { BookOpen, GraduationCap, FileText } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { getStudentData, formatINR } from '@/lib/student-data';

export const metadata = { title: 'My Courses - Gnosis Kaksha' };

export default function StudentCoursesPage() {
  const { subjects, profile } = getStudentData();
  const totalMonthly = subjects.reduce((sum, s) => sum + s.monthlyFee, 0);

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
                <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4 text-sm text-[#718096]">
                  <FileText size={15} />
                  Materials coming soon
                </div>
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
