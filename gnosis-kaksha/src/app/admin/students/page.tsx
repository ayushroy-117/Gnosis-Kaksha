'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, ExternalLink } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Select } from '@/components/ui/Select';
import { useApi } from '@/hooks/useApi';
import {
  classLabel,
  formatINR,
  type RosterStudent,
  type StudentFeeState,
} from '@/lib/institute-data';

const FEE_BADGE: Record<StudentFeeState, { tone: 'green' | 'red' | 'amber'; label: string }> = {
  paid: { tone: 'green', label: 'Paid' },
  due: { tone: 'red', label: 'Due' },
  pending_verification: { tone: 'amber', label: 'Verifying' },
};

export default function AdminStudentsPage() {
  const { data, error, loading, reload } = useApi<{ students: RosterStudent[] }>('/api/admin/students');
  const branchesApi = useApi<{ branches: { id: string; name: string }[] }>('/api/branches');
  const [branchFilter, setBranchFilter] = useState('');

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading || !data) return <LoadingState label="Loading students…" />;

  const roster = data.students;
  const branches = branchesApi.data?.branches ?? [];
  const sorted = roster
    .filter((s) => !branchFilter || s.branchId === branchFilter)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Students</h1>
          <p className="mt-1 text-[#4A5568]">
            {roster.length} student{roster.length === 1 ? '' : 's'} on record across the institute.
          </p>
        </div>
        {branches.length > 0 && (
          <div className="w-full sm:w-64">
            <Select
              aria-label="Filter by branch"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              options={[
                { value: '', label: 'All branches' },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title={branchFilter ? 'No students in this branch' : 'No students yet'}
          message={
            branchFilter
              ? 'No students on record for the selected branch.'
              : 'Enrolled students will appear here once admissions are approved.'
          }
        />
      ) : (
        <SectionCard title="Student Roster" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Branch</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3">Board</th>
                  <th className="px-6 py-3">Subjects</th>
                  <th className="px-6 py-3">Scholarship</th>
                  <th className="px-6 py-3 text-right">Monthly Fee</th>
                  <th className="px-6 py-3">Fees</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Portal</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-[#4A5568]">{s.branchName || '—'}</td>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge tone={FEE_BADGE[s.feeState].tone}>{FEE_BADGE[s.feeState].label}</Badge>
                      {s.amountDue > 0 && (
                        <p className="mt-1 text-xs text-[#718096]">{formatINR(s.amountDue)} due</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {s.status === 'pending' ? (
                        <Badge tone="amber">Pending</Badge>
                      ) : s.status === 'rejected' ? (
                        <Badge tone="red">Rejected</Badge>
                      ) : (
                        <Badge tone="blue">Active</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/student/dashboard?as=${encodeURIComponent(s.id)}`}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-[#1295D8] hover:underline"
                      >
                        View portal <ExternalLink size={14} />
                      </Link>
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
