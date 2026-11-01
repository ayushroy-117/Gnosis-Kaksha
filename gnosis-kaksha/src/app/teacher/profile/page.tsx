'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Briefcase, IdCard, Mail, MapPin, Phone, Quote, ShieldCheck, User, Wallet } from 'lucide-react';
import { Badge } from '@/components/dashboard/Badge';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { FacultyIdCard } from '@/components/staff/FacultyIdCard';
import { PersonalTab, ProfessionalTab, SecurityTab, type ActivityItem } from '@/components/staff/ProfileSections';
import { SalaryTab } from '@/components/staff/SalaryTab';
import { useApi } from '@/hooks/useApi';
import type { StaffProfile } from '@/lib/server/staff';
import type { TeacherData } from '@/lib/institute-data';

const TABS = [
  { id: 'personal', label: 'Personal Information', icon: User },
  { id: 'professional', label: 'Professional Information', icon: Briefcase },
  { id: 'id', label: 'ID Card', icon: IdCard },
  { id: 'salary', label: 'Salary Information', icon: Wallet },
  { id: 'security', label: 'Accounts & Security', icon: ShieldCheck },
] as const;
type Tab = (typeof TABS)[number]['id'];

const STATUS_BADGE = {
  active: { tone: 'green' as const, label: 'Active Staff' },
  resigned: { tone: 'amber' as const, label: 'Resigned' },
  terminated: { tone: 'red' as const, label: 'Terminated' },
};

export default function TeacherProfilePage() {
  const { data, error, loading, reload, setData } = useApi<{ profile: StaffProfile; activity: ActivityItem[] }>('/api/staff/me');
  const { data: teacherData } = useApi<TeacherData>('/api/data/teacher');
  const requested = useSearchParams().get('tab');
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.id === requested) ? (requested as Tab) : 'personal');

  if (loading && !data) return <LoadingState label="Loading profile…" />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  const p = data?.profile;
  if (!p) return null;

  const status = STATUS_BADGE[p.employmentStatus];
  const onSaved = (profile: StaffProfile) => setData((d) => (d ? { ...d, profile } : d));

  return (
    <div className="space-y-6">
      {/* Header (hidden on print) */}
      <div className="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-xs md:flex-row md:items-center print:hidden">
        <div
          data-testid="teacher-photo"
          className="flex h-32 w-28 shrink-0 items-center justify-center self-center overflow-hidden rounded-2xl border-2 border-[#1295D8] bg-[#CDE6F7]"
        >
          {p.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- auth-gated API image
            <img src={p.photoUrl} alt={p.fullName} className="h-full w-full object-cover" />
          ) : (
            <User size={48} className="text-[#1295D8]" />
          )}
        </div>
        <div className="min-w-0 flex-1 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <h1 className="text-2xl font-black text-[#1A2B4A]">{p.fullName}</h1>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="mt-0.5 text-sm font-semibold text-[#1295D8]">{p.designation}</p>
          <p className="text-sm font-medium text-[#1A2B4A]">Faculty ID: <span className="font-mono" data-testid="staff-code">{p.staffCode}</span></p>
          <div className="mt-2 space-y-1 text-sm text-[#4A5568]">
            <p className="flex items-center justify-center gap-2 md:justify-start"><Mail size={14} className="text-[#1295D8]" /> {p.email}</p>
            {p.phone && <p className="flex items-center justify-center gap-2 md:justify-start"><Phone size={14} className="text-[#1295D8]" /> +91 {p.phone}</p>}
            {p.address && <p className="flex items-center justify-center gap-2 md:justify-start"><MapPin size={14} className="text-[#1295D8]" /> {p.address}</p>}
          </div>
        </div>
        {p.quote && (
          <blockquote className="max-w-xs rounded-xl bg-indigo-50 p-4 text-sm italic text-indigo-900">
            <Quote size={18} className="mb-1 text-indigo-400" />
            “{p.quote}”
            <footer className="mt-1 text-xs not-italic text-indigo-700">— {p.fullName}</footer>
          </blockquote>
        )}
      </div>

      {/* Tabs (hidden on print) */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 print:hidden" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === id ? 'border-[#1295D8] text-[#1295D8]' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="print:hidden">
        {tab === 'personal' && <PersonalTab p={p} onSaved={onSaved} />}
        {tab === 'professional' && <ProfessionalTab p={p} assignments={teacherData?.assignments ?? null} onSaved={onSaved} />}
        {tab === 'security' && <SecurityTab p={p} activity={data?.activity ?? []} />}
      </div>
      {tab === 'salary' && <SalaryTab p={p} onSaved={onSaved} />}
      {tab === 'id' && <FacultyIdCard p={p} status={status} />}
    </div>
  );
}
