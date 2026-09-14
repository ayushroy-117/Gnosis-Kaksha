import { User, Pencil } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { getStudentData, formatDate } from '@/lib/student-data';

export const metadata = { title: 'My Profile - Gnosis Kaksha' };

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-[#718096]">{label}</dt>
      <dd className="mt-0.5 text-base font-medium text-[#1A2B4A]">{value}</dd>
    </div>
  );
}

export default function StudentProfilePage() {
  const { profile } = getStudentData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">My Profile</h1>
        <p className="mt-1 text-[#4A5568]">Your registration and contact details.</p>
      </div>

      {/* Identity header */}
      <div className="flex flex-col items-center gap-4 rounded-[12px] border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7] text-[#1295D8]">
          <User size={44} />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-bold text-[#1A2B4A]">{profile.fullName}</h2>
          <p className="text-[#718096]">{profile.registrationNumber}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Badge tone="blue">Class {profile.classNumber}</Badge>
            {profile.stream && <Badge tone="gray">{profile.stream}</Badge>}
            <Badge tone="gray">{profile.board}</Badge>
          </div>
        </div>
        <button
          type="button"
          disabled
          title="Editing will be available soon"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#718096]"
        >
          <Pencil size={15} />
          Edit (coming soon)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Personal Details">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" value={profile.fullName} />
            <Field label="Registration Number" value={profile.registrationNumber} />
            <Field label="Class" value={String(profile.classNumber)} />
            <Field label="Stream" value={profile.stream ?? 'Not applicable'} />
            <Field label="Board" value={profile.board} />
            <Field label="Admission Date" value={formatDate(profile.admissionDate)} />
          </dl>
        </SectionCard>

        <SectionCard title="Contact Details">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Student Mobile" value={profile.mobile} />
            <Field label="Email" value={profile.email} />
            <Field label="Parent / Guardian" value={profile.parentName} />
            <Field label="Guardian Mobile" value={profile.guardianMobile} />
            <div className="sm:col-span-2">
              <Field label="Address" value={profile.address} />
            </div>
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}
