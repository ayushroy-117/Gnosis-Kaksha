import { Users } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import {
  getAdminData,
  classLabel,
  formatINR,
  type RosterStudent,
} from '@/lib/institute-data';

export const metadata = { title: 'Students - Gnosis Kaksha' };

export default function AdminStudentsPage() {
  const { roster } = getAdminData();
  const sorted = [...roster].sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Students</h1>
        <p className="mt-1 text-[#4A5568]">
          {roster.length} students enrolled across the institute.
        </p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students yet"
          message="Enrolled students will appear here once admissions are approved."
        />
      ) : (
        <SectionCard title="Student Roster" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Board</th>
                  <th className="px-6 py-3">Subjects</th>
                  <th className="px-6 py-3">Scholarship</th>
                  <th className="px-6 py-3 text-right">Monthly Fee</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((s: RosterStudent) => (
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
                    <td className="px-6 py-4 whitespace-nowrap text-[#4A5568]">
                      {classLabel(s)}
                    </td>
                    <td className="px-6 py-4 text-[#4A5568]">{s.board}</td>
                    <td className="px-6 py-4 text-[#4A5568]">{s.subjects.length}</td>
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
                    <td className="px-6 py-4">
                      {s.status === 'pending' ? (
                        <Badge tone="amber">Pending</Badge>
                      ) : (
                        <Badge tone="blue">Active</Badge>
                      )}
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
