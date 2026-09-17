import { Users } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { getAllStudents } from '@/lib/institute-store';
import { classLabel, formatINR } from '@/lib/institute-data';

export const metadata = { title: 'Students - Teacher Portal' };

export default function TeacherStudentsPage() {
  const students = getAllStudents().filter((s) => s.status === 'active');
  const sorted = [...students].sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div className="space-y-6">
      <SampleDataBanner />

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Students</h1>
        <p className="mt-1 text-[#4A5568]">
          {sorted.length} active students across the institute.
        </p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No active students"
          message="Active students will appear here once admissions are approved."
        />
      ) : (
        <SectionCard title="Active Student Roster" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Subjects</th>
                  <th className="px-6 py-3">Scholarship</th>
                  <th className="px-6 py-3 text-right">Monthly Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F7FAFC]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7] text-xs font-semibold text-[#2E5EAA]">
                          {s.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1A2B4A]">{s.fullName}</p>
                          <p className="text-xs text-[#718096]">{s.registrationNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#4A5568]">{classLabel(s)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {s.subjects.map((sub) => (
                          <span
                            key={sub}
                            className="rounded-full bg-[#F7FAFC] px-2 py-0.5 text-xs font-medium text-[#4A5568] ring-1 ring-inset ring-gray-200"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.scholarshipPercent > 0 ? (
                        <Badge tone="green">{s.scholarshipPercent}%</Badge>
                      ) : (
                        <span className="text-[#718096]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-[#1A2B4A]">
                      {formatINR(s.tuitionAfterScholarship)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
