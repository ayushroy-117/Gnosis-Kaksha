import { UserPlus, Check, X, GraduationCap } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import {
  getAdminData,
  classLabel,
  formatINR,
  formatDate,
} from '@/lib/institute-data';

export const metadata = { title: 'Admissions - Gnosis Kaksha' };

export default function AdminAdmissionsPage() {
  const { pendingAdmissions } = getAdminData();

  return (
    <div className="space-y-6">
      <SampleDataBanner />

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Admissions</h1>
        <p className="mt-1 text-[#4A5568]">
          {pendingAdmissions.length} application
          {pendingAdmissions.length === 1 ? '' : 's'} awaiting review.
        </p>
      </div>

      {pendingAdmissions.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No pending admissions"
          message="New applications submitted through the admission form will appear here."
        />
      ) : (
        <div className="space-y-5">
          {pendingAdmissions.map((s) => (
            <div
              key={s.id}
              className="rounded-[12px] border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7] text-[#2E5EAA]">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-[#1A2B4A]">
                        {s.fullName}
                      </h2>
                      <Badge tone="amber">Pending</Badge>
                    </div>
                    <p className="text-sm text-[#718096]">
                      {classLabel(s)} · {s.board} · Applied {formatDate(s.admissionDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled
                    title="Coming soon"
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white opacity-60"
                  >
                    <Check size={16} /> Approve
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Coming soon"
                    className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-[#4A5568] opacity-60"
                  >
                    <X size={16} /> Reject
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-8 gap-y-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Parent / Guardian" value={s.parentName} />
                <Detail label="Mobile" value={s.mobile} />
                <Detail label="Email" value={s.email} />
                <Detail
                  label="Previous %"
                  value={`${s.previousPercentage}%`}
                />
                <Detail
                  label="Scholarship"
                  value={
                    s.scholarshipPercent > 0 ? `${s.scholarshipPercent}% discount` : 'Not eligible'
                  }
                />
                <Detail
                  label="Monthly Tuition"
                  value={`${formatINR(s.tuitionAfterScholarship)} / month`}
                />
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
                    Subjects
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {s.subjects.map((sub) => (
                      <span
                        key={sub}
                        className="rounded-full bg-[#F7FAFC] px-3 py-1 text-xs font-medium text-[#4A5568] ring-1 ring-inset ring-gray-200"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium text-[#1A2B4A]">{value}</p>
    </div>
  );
}
