'use client';

import { useState } from 'react';
import { User, Printer, ShieldCheck, Mail, Phone, Briefcase, Calendar, MapPin, Users, RotateCw, Wallet, IdCard } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { Button } from '@/components/ui/Button';
import { Barcode } from '@/components/ui/Barcode';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { QRCodeSVG } from 'qrcode.react';
import { useApi } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';
import { HELPLINE_DISPLAY, INSTITUTE_ADDRESS_SHORT, INSTITUTE_NAME, SITE_URL } from '@/lib/institute-contact';
import {
  CARD_PRINT_CSS,
  CardBottomStrip,
  CardHeader,
  DIRECTOR_SIGNATURE_SRC,
  GOLD_BAR,
  SignatureImg,
} from '@/components/id-card/parts';
import type { StaffProfile } from '@/lib/server/staff';

/** Back-of-card instructions (text supplied by the institute). */
export const STAFF_CARD_RULES = [
  'This card is the official institutional property of Gnosis Kaksha and must be worn or carried within the campus.',
  'This card serves as authorized faculty identification for academic batches, evaluations, and official meetings.',
  'In case of card loss or damage, immediately notify the Administration Office for a reissue.',
  'Faculty members are expected to uphold the highest standards of academic excellence and professional ethics.',
  'This card is non-transferable and must not be used by any other person.',
  'The card must be surrendered to the Administration upon resignation, termination, or cessation of employment.',
  'Any unauthorized use, alteration, or misuse of this card may result in disciplinary action.',
];

const CARD_H = 'h-[580px]';
type Tab = 'personal' | 'professional' | 'id' | 'salary';

function Item({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      {icon && <div className="mt-0.5 shrink-0 text-[#1295D8]">{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#718096]">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-[#1A2B4A]">{value || <span className="font-normal text-gray-400">Not provided yet</span>}</p>
      </div>
    </div>
  );
}

function CardRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[7.5px] font-bold uppercase leading-none tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 line-clamp-2 text-[9.5px] font-semibold leading-tight text-slate-800">{value || '—'}</p>
    </div>
  );
}

const STATUS_BADGE = {
  active: { tone: 'green' as const, label: 'Active Staff' },
  resigned: { tone: 'amber' as const, label: 'Resigned' },
  terminated: { tone: 'red' as const, label: 'Terminated' },
};

export default function TeacherProfilePage() {
  const { data, error, loading, reload } = useApi<{ profile: StaffProfile }>('/api/staff/me');
  const [tab, setTab] = useState<Tab>('personal');
  const [side, setSide] = useState<'both' | 'front' | 'back'>('both');

  if (loading && !data) return <LoadingState label="Loading profile…" />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  const p = data?.profile;
  if (!p) return null;

  const status = STATUS_BADGE[p.employmentStatus];
  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'personal', label: 'Personal Information', icon: <User size={15} /> },
    { id: 'professional', label: 'Professional Information', icon: <Briefcase size={15} /> },
    { id: 'id', label: 'ID Card', icon: <IdCard size={15} /> },
    { id: 'salary', label: 'Salary Information', icon: <Wallet size={15} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header (hidden on print) */}
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-xs sm:flex-row print:hidden">
        <div
          data-testid="teacher-photo"
          className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#1295D8] bg-[#CDE6F7]"
        >
          {p.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- auth-gated API image
            <img src={p.photoUrl} alt={p.fullName} className="h-full w-full object-cover" />
          ) : (
            <User size={48} className="text-[#1295D8]" />
          )}
        </div>
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-black text-[#1A2B4A]">{p.fullName}</h1>
            <Badge tone={status.tone}>{status.label}</Badge>
            <Badge tone="blue">{p.staffCode}</Badge>
          </div>
          <p className="mt-1 text-sm font-semibold text-[#1295D8]">{p.designation}</p>
          <p className="mt-0.5 text-xs text-gray-500">{p.email}</p>
        </div>
      </div>

      {/* Tabs (hidden on print) */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 print:hidden" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id ? 'border-[#1295D8] text-[#1295D8]' : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'personal' && (
        <SectionCard title="Personal Information" className="print:hidden">
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2" data-testid="personal-info">
            <Item label="Full Name" value={p.fullName} icon={<User size={16} />} />
            <Item label="Father's Name" value={p.fatherName} icon={<Users size={16} />} />
            <Item label="Contact Number" value={p.phone ? `+91 ${p.phone}` : null} icon={<Phone size={16} />} />
            <Item label="Email" value={p.email} icon={<Mail size={16} />} />
            <div className="sm:col-span-2">
              <Item label="Address" value={p.address} icon={<MapPin size={16} />} />
            </div>
          </dl>
          <p className="mt-4 text-xs text-[#718096]">These details come from the administration office. Contact them to correct anything here.</p>
        </SectionCard>
      )}

      {tab === 'professional' && (
        <SectionCard title="Professional Information" className="print:hidden">
          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2" data-testid="professional-info">
            <Item label="Designation" value={p.designation} icon={<Briefcase size={16} />} />
            <Item label="Department" value={p.department} icon={<Briefcase size={16} />} />
            <Item label="Staff ID" value={p.staffCode} icon={<ShieldCheck size={16} />} />
            <Item label="Date of Joining" value={p.dateOfJoining ? formatDate(p.dateOfJoining) : null} icon={<Calendar size={16} />} />
            <Item label="Branch" value={p.branchName} icon={<MapPin size={16} />} />
            <Item label="Employment Status" value={status.label} icon={<ShieldCheck size={16} />} />
          </dl>
        </SectionCard>
      )}

      {tab === 'salary' && (
        <SectionCard title="Salary Information" className="print:hidden">
          <p className="text-sm text-[#4A5568]" data-testid="salary-placeholder">
            Salary details, receipts, incentives and deductions will be linked to the Accountant portal in the next phase.
          </p>
        </SectionCard>
      )}

      {tab === 'id' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:m-0 print:border-none print:p-0 print:shadow-none">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4 print:hidden">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#1A2B4A]">Faculty ID Card</h2>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-semibold">
                {(['both', 'front', 'back'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={`rounded-md px-3 py-1.5 capitalize ${side === s ? 'bg-white text-[#1295D8] shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {s === 'both' ? 'Side-by-Side View' : `${s} Side`}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSide(side === 'back' ? 'front' : 'back')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 md:hidden"
              >
                <RotateCw size={14} /> Flip Card
              </button>
              <Button
                type="button"
                onClick={() => window.print()}
                disabled={p.employmentStatus !== 'active'}
                className="gap-2 bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] text-white"
              >
                <Printer size={16} /> Print Faculty ID Card (PDF)
              </Button>
            </div>
          </div>

          <div className="id-card-sheet flex flex-col items-center justify-center gap-8 lg:flex-row lg:items-start lg:gap-10">
            {/* ══ FRONT ══ */}
            {side !== 'back' && (
              <div
                data-testid="staff-card-front"
                className={`id-card-element relative flex w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ${CARD_H}`}
              >
                <CardHeader badge="FACULTY" />
                <div className={`h-[3.5px] ${GOLD_BAR}`} />

                <div className="relative z-10 flex flex-1 flex-col justify-between bg-gradient-to-b from-white to-[#F8FAFC] p-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex shrink-0 flex-col items-center gap-1.5">
                      <div className="flex h-[118px] w-[94px] items-center justify-center overflow-hidden rounded-lg border-2 border-[#1E3A8A] bg-blue-50/60 p-0.5 shadow-sm">
                        {p.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- auth-gated API image
                          <img src={p.photoUrl} alt={p.fullName} className="h-full w-full rounded-md object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-[#1E3A8A]">
                            <User size={40} strokeWidth={1.5} />
                            <span className="mt-1 text-[8px] font-extrabold tracking-widest text-slate-500">PHOTO</span>
                          </div>
                        )}
                      </div>
                      <span className="rounded-full bg-[#1E293B] px-2.5 py-0.5 text-[8px] font-black tracking-wider text-amber-300">{p.staffCode}</span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5 text-left">
                      <div>
                        <p className="text-[7.5px] font-bold uppercase leading-none tracking-wider text-slate-400">Faculty Name</p>
                        <p className="mt-0.5 truncate text-[13px] font-black leading-tight text-[#0F172A]">{p.fullName}</p>
                      </div>
                      <div>
                        <p className="text-[7.5px] font-bold uppercase leading-none tracking-wider text-slate-400">Designation</p>
                        <p className="mt-0.5 text-[10px] font-bold leading-tight text-[#1295D8]">{p.designation}</p>
                      </div>
                      <CardRow label="Email" value={p.email} />
                      <CardRow label="Contact No." value={p.phone ? `+91 ${p.phone}` : null} />
                      <CardRow label="Father's Name" value={p.fatherName} />
                      <CardRow label="Address" value={p.address} />
                      <CardRow label="Date of Joining" value={p.dateOfJoining ? formatDate(p.dateOfJoining) : null} />
                    </div>
                  </div>

                  <div className="text-center" data-testid="staff-barcode">
                    <Barcode value={p.staffCode} width={250} height={38} />
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="flex flex-col items-center">
                      <SignatureImg src={DIRECTOR_SIGNATURE_SRC} alt="Director's signature" />
                      <div className="mt-0.5 w-32 border-t border-slate-400 pt-0.5 text-center">
                        <p className="text-[7.5px] font-bold uppercase leading-none tracking-wider text-slate-700">Authorized Signatory</p>
                        <p className="mt-0.5 text-[6.5px] font-medium leading-none text-slate-500">Director, {INSTITUTE_NAME}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="rounded-md border border-slate-300 bg-white p-1" data-testid="staff-qr">
                        <QRCodeSVG value={`${SITE_URL}/verify/staff/${p.staffCode}`} size={52} level="M" fgColor="#0F172A" />
                      </div>
                      <span className="text-[6.5px] font-semibold uppercase tracking-tighter text-slate-500">Scan to Verify</span>
                    </div>
                  </div>
                </div>
                <CardBottomStrip />
              </div>
            )}

            {/* ══ BACK ══ */}
            {side !== 'front' && (
              <div
                data-testid="staff-card-back"
                className={`id-card-element relative flex w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ${CARD_H}`}
              >
                <div className="relative z-10 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1E3A8A] px-4 pb-3 pt-5 text-center text-white">
                  <h4 className="text-xs font-black uppercase tracking-widest">Instructions</h4>
                  <p className="mt-0.5 text-[8px] font-semibold tracking-wider text-sky-200">{INSTITUTE_NAME} | OFFICIAL FACULTY CARD</p>
                </div>
                <div className={`h-[3px] ${GOLD_BAR}`} />

                <div className="relative z-10 flex flex-1 flex-col justify-between bg-white p-3.5">
                  <ol className="space-y-1.5">
                    {STAFF_CARD_RULES.map((rule, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#1E3A8A] text-[7px] font-bold text-white">
                          {i + 1}
                        </span>
                        <p className="text-[8px] leading-tight text-slate-700">{rule}</p>
                      </li>
                    ))}
                  </ol>

                  <div className="rounded-lg border border-amber-300 bg-amber-50/90 p-2 text-center">
                    <p className="text-[8px] font-bold leading-tight text-amber-900">Helpline: {HELPLINE_DISPLAY}</p>
                    <p className="mt-0.5 text-[7.5px] font-semibold leading-tight text-amber-800">{INSTITUTE_ADDRESS_SHORT}</p>
                  </div>

                  <div className="flex flex-col items-center border-t border-slate-200 pt-2">
                    <p
                      data-testid="cardholder-signature"
                      className="text-[22px] leading-none text-[#1E3A8A]"
                      style={{ fontFamily: "'Segoe Script', 'Brush Script MT', 'Lucida Handwriting', cursive", fontStyle: 'italic' }}
                    >
                      {p.fullName}
                    </p>
                    <div className="mt-1 w-40 border-t border-slate-400 pt-0.5 text-center text-[7.5px] font-bold uppercase tracking-wider text-slate-700">
                      Cardholder&apos;s Signature
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between bg-[#0F172A] px-3.5 py-2 text-[7.5px] text-slate-300">
                  <span className="flex items-center gap-1">
                    <Calendar size={9} className="text-amber-400" /> Academic Year: 2026–2027
                  </span>
                  <span className="font-bold text-amber-400">Official Staff Credential</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{CARD_PRINT_CSS}</style>
    </div>
  );
}
