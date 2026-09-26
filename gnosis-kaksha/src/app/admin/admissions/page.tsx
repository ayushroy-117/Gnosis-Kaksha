'use client';

import Link from 'next/link';
import { UserPlus, GraduationCap, CreditCard, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { useApi } from '@/hooks/useApi';
import { ApprovalActions } from './_components/ApprovalActions';
import {
  classLabel,
  formatINR,
  formatDate,
  receiptLabel,
  type AdminData,
  type AccountantData,
  type Transaction,
} from '@/lib/institute-data';

export default function AdminAdmissionsPage() {
  const admin = useApi<AdminData>('/api/data/admin');
  const accounts = useApi<AccountantData>('/api/data/accountant');

  const reloadAll = () => {
    admin.reload();
    accounts.reload();
  };

  if (admin.error) return <ErrorState message={admin.error.message} onRetry={admin.reload} />;
  if (admin.loading || !admin.data) return <LoadingState label="Loading admissions…" />;

  const { pendingAdmissions } = admin.data;
  const pendingByStudent = new Map<string, Transaction>();
  const verifiedByStudent = new Map<string, Transaction>();
  for (const t of accounts.data?.pendingVerifications ?? []) {
    if (!pendingByStudent.has(t.studentId)) pendingByStudent.set(t.studentId, t);
  }
  for (const t of accounts.data?.transactions ?? []) {
    if (t.status === 'verified' && t.purpose === 'admission' && !verifiedByStudent.has(t.studentId)) {
      verifiedByStudent.set(t.studentId, t);
    }
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Admissions</h1>
        <p className="mt-1 text-[#4A5568]">
          {pendingAdmissions.length} application
          {pendingAdmissions.length === 1 ? '' : 's'} awaiting review.
        </p>
      </div>

      {accounts.error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>Payment status could not be loaded: {accounts.error.message}</span>
          <button
            type="button"
            onClick={accounts.reload}
            className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

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
                    <div className="flex flex-wrap items-center gap-2">
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

                <ApprovalActions id={s.id} name={s.fullName} onDone={reloadAll} />
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
                <PaymentStatus
                  loading={accounts.loading && !accounts.data}
                  unavailable={!!accounts.error}
                  pending={pendingByStudent.get(s.id)}
                  verified={verifiedByStudent.get(s.id)}
                />
                {s.tshirtSize && (
                  <Detail label="T-Shirt Size" value={s.tshirtSize.toUpperCase()} />
                )}
                {s.address && <Detail label="Address" value={s.address} />}
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

function PaymentStatus({
  loading,
  unavailable,
  pending,
  verified,
}: {
  loading: boolean;
  unavailable: boolean;
  pending?: Transaction;
  verified?: Transaction;
}) {
  const header = (
    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#718096]">
      <CreditCard size={14} /> Admission Payment
    </p>
  );

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-[#F7FAFC] p-3">
        {header}
        <p className="mt-1 text-sm text-[#718096]">Checking payment status…</p>
      </div>
    );
  }
  if (unavailable) {
    return (
      <div className="rounded-lg border border-gray-200 bg-[#F7FAFC] p-3">
        {header}
        <p className="mt-1 text-sm text-[#718096]">Payment status unavailable.</p>
      </div>
    );
  }
  if (pending) {
    const ref = pending.utr || pending.upiReference;
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        {header}
        <div className="mt-1.5">
          <Badge tone="amber">Payment pending review</Badge>
        </div>
        <p className="mt-1.5 text-sm font-medium text-[#1A2B4A]">
          {formatINR(pending.amount)} via {pending.method}
          {ref && <span className="font-mono"> · UTR {ref}</span>}
        </p>
        <Link
          href="/accountant/collections"
          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#1295D8] hover:underline"
        >
          Review in collections <ArrowRight size={13} />
        </Link>
      </div>
    );
  }
  if (verified) {
    return (
      <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-3">
        {header}
        <div className="mt-1.5">
          <Badge tone="green">Payment verified</Badge>
        </div>
        <p className="mt-1.5 text-sm font-medium text-[#1A2B4A]">
          {formatINR(verified.amount)} · {receiptLabel(verified)}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-[#F7FAFC] p-3">
      {header}
      <div className="mt-1.5">
        <Badge tone="gray">No payment recorded</Badge>
      </div>
    </div>
  );
}
