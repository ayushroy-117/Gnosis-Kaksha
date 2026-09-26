import { UserPlus, GraduationCap, CreditCard } from 'lucide-react';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { ApprovalActions } from './_components/ApprovalActions';
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
                      <Badge tone="amber">Pending Approval</Badge>
                      <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {s.registrationNumber}
                      </span>
                    </div>
                    <p className="text-sm text-[#718096]">
                      {classLabel(s)} · {s.board} · Applied {formatDate(s.admissionDate)}
                    </p>
                  </div>
                </div>

                <ApprovalActions id={s.id} name={s.fullName} />
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
                <div className="rounded-lg bg-[#F0FDF4] p-3 border border-[#BBF7D0]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-800 flex items-center gap-1.5">
                    <CreditCard size={14} /> UPI Payment Verification
                  </p>
                  <p className="mt-1 text-sm font-mono font-bold text-green-900">
                    UTR: {s.upiUtr || 'Paid at counter'}
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Admission Fee: ₹{s.mandatoryCharges + s.tuitionAfterScholarship} (verified via UPI)
                  </p>
                </div>
                {s.tshirtSize && (
                  <Detail label="T-Shirt Size" value={s.tshirtSize.toUpperCase()} />
                )}
                {s.city && (
                  <Detail label="Location" value={`${s.city}, ${s.state || 'Assam'}`} />
                )}
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
                    Enrolled Subjects
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {s.subjects.map((sub: string) => (
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
