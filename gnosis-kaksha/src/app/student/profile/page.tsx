'use client';

import { useMemo } from 'react';
import { User, Printer, ShieldCheck, BookOpen, Phone, MapPin, Calendar } from 'lucide-react';

import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { Button } from '@/components/ui/Button';
import { getStudentData, formatDate } from '@/lib/student-data';
import { useAuth } from '@/hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[#718096]">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-[#1A2B4A]">{value}</dd>
    </div>
  );
}

/* ── Simple SVG barcode from registration number ── */
function Barcode({ value }: { value: string }) {
  // Generate a deterministic bar pattern from the reg number string
  const bars: { width: number; isBlack: boolean }[] = [];
  const seed = value.split('').map((c) => c.charCodeAt(0));
  let i = 0;
  let totalW = 0;
  while (totalW < 180) {
    const w = (seed[i % seed.length] % 3) + 1; // 1, 2 or 3 units wide
    bars.push({ width: w * 2, isBlack: i % 2 === 0 });
    totalW += w * 2;
    i++;
  }
  let x = 0;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width="180" height="36" viewBox={`0 0 180 36`} xmlns="http://www.w3.org/2000/svg">
        {bars.map((bar, idx) => {
          const rect = bar.isBlack ? (
            <rect key={idx} x={x} y={0} width={bar.width} height={36} fill="#1A2B4A" />
          ) : null;
          x += bar.width;
          return rect;
        })}
      </svg>
      <span className="font-mono text-[8px] tracking-widest text-[#1A2B4A] font-bold">{value}</span>
    </div>
  );
}

/* ── Auto-generated cursive signature SVG ── */
function AutoSignature({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 140 40" xmlns="http://www.w3.org/2000/svg" className="w-36 h-10">
      {/* Decorative cursive lines representing a signature */}
      <path
        d="M8 28 C20 10, 35 8, 50 20 C60 28, 68 14, 80 18 C92 22, 100 30, 110 22 C120 14, 128 18, 132 26"
        fill="none"
        stroke="#1A2B4A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 32 C30 32, 70 32, 134 32"
        fill="none"
        stroke="#1A2B4A"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeDasharray="3 2"
      />
      <text x="70" y="38" textAnchor="middle" fontSize="6" fill="#4A5568" fontFamily="serif" fontStyle="italic">
        {name.split(' ').slice(-1)[0]}
      </text>
    </svg>
  );
}

export default function StudentProfilePage() {
  const { user } = useAuth();
  const { profile } = useMemo(() => {
    const identifier = user?.registrationNumber || user?.email || user?.id;
    return getStudentData(identifier);
  }, [user]);

  const fatherName = profile.parentName || 'Guardian';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">My Profile</h1>
          <p className="mt-1 text-[#4A5568]">Your official registration, student identity, and guardian details.</p>
        </div>
        <Button
          type="button"
          onClick={() => window.print()}
          variant="outline"
          className="print:hidden gap-2"
        >
          <Printer size={16} /> Print Student ID Card
        </Button>
      </div>

      {/* ============================================================
          PRINTABLE ID CARD AREA — only this shows when printing
          ============================================================ */}
      <div id="id-card-print" className="print:block">

        {/* ── FRONT SIDE ── */}
        <div className="max-w-sm mx-auto rounded-2xl border-2 border-[#1295D8] bg-white shadow-xl overflow-hidden print:rounded-none print:border print:shadow-none print:max-w-full print:break-after-page">

          {/* Header: Logo + Institute Name */}
          <div className="bg-gradient-to-r from-[#1A2B4A] to-[#2E5EAA] text-white px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Logo circle */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 border-2 border-white/40">
                <BookOpen size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black tracking-wide text-sm leading-tight">GNOSIS KAKSHA</h3>
                <p className="text-[9px] text-[#CDE6F7] leading-tight">Premier Coaching Institute</p>
                <p className="text-[8px] text-[#A0C4E8] leading-tight">Ramkrishna Nagar, Karimganj, Assam – 788713</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[9px] font-bold bg-[#1295D8] px-2 py-0.5 rounded text-white whitespace-nowrap">
                  2026–2027
                </span>
                <p className="text-[8px] text-[#CDE6F7] mt-0.5">STUDENT ID</p>
              </div>
            </div>
          </div>

          {/* Thin accent line */}
          <div className="h-1 bg-gradient-to-r from-[#1295D8] via-[#FFC107] to-[#1295D8]" />

          {/* Card Body */}
          <div className="p-4 flex gap-3">
            {/* Photo box */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-20 h-24 rounded-lg bg-[#F0F7FD] border-2 border-[#1295D8] flex flex-col items-center justify-center text-[#1295D8] overflow-hidden">
                {profile.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photoUrl} alt="Student" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <User size={30} />
                    <span className="text-[8px] font-semibold mt-1 text-[#1295D8]">PHOTO</span>
                  </>
                )}
              </div>
              <span className="text-[9px] font-bold text-[#2E5EAA] bg-[#EBF5FF] px-2 py-0.5 rounded">
                CLASS {profile.classNumber}
              </span>
            </div>

            {/* Student Info */}
            <div className="flex-1 space-y-1.5 text-[10px] min-w-0">
              <InfoRow label="Student Name" value={profile.fullName} bold />
              <InfoRow label="Registration No." value={profile.registrationNumber} mono />
              <InfoRow label="Father's Name" value={fatherName} />
              <InfoRow label="Contact No." value={profile.mobile} />
              <InfoRow label="Address" value={profile.address} small />
            </div>
          </div>

          {/* Verification strip */}
          <div className="mx-4 mb-3 flex items-center gap-1.5 rounded-md bg-green-50 border border-green-200 px-3 py-1.5">
            <ShieldCheck size={12} className="text-green-600 shrink-0" />
            <span className="text-[9px] font-bold text-green-700 uppercase tracking-wide">
              Verified Member — Academic Year 2026–2027
            </span>
          </div>

          {/* Barcode */}
          <div className="flex justify-center pb-3">
            <Barcode value={profile.registrationNumber} />
          </div>

          {/* Footer: Signature + QR */}
          <div className="border-t border-gray-200 px-4 py-3 flex items-end justify-between">
            <div className="flex flex-col items-center gap-0.5">
              <AutoSignature name="Gnosis Kaksha" />
              <span className="text-[8px] text-gray-500 font-semibold uppercase tracking-wide">
                Authorized Signatory
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="p-1 bg-white border border-gray-300 rounded">
                <QRCodeSVG
                  value={`https://gnosiskaksha.cloud/verify/${profile.registrationNumber}`}
                  size={52}
                  level="M"
                />
              </div>
              <span className="text-[7px] text-gray-400">Scan to verify</span>
            </div>
          </div>

          {/* Bottom address bar */}
          <div className="bg-[#1A2B4A] text-white px-4 py-1.5 flex items-center justify-between text-[8px]">
            <span className="flex items-center gap-1"><MapPin size={8} /> Ramkrishna Nagar, Karimganj, Assam</span>
            <span className="flex items-center gap-1"><Phone size={8} /> gnosiskaksha.cloud</span>
          </div>
        </div>

        {/* ── BACK SIDE ── */}
        <div className="max-w-sm mx-auto mt-6 rounded-2xl border-2 border-[#1295D8] bg-white shadow-xl overflow-hidden print:rounded-none print:border print:shadow-none print:max-w-full print:mt-0">

          {/* Back Header */}
          <div className="bg-gradient-to-r from-[#1A2B4A] to-[#2E5EAA] text-white px-4 py-2.5 text-center">
            <h4 className="font-black tracking-widest text-xs uppercase">Rules & Regulations</h4>
            <p className="text-[8px] text-[#CDE6F7] mt-0.5">Gnosis Kaksha — Student Identity Card</p>
          </div>

          <div className="h-0.5 bg-gradient-to-r from-[#1295D8] via-[#FFC107] to-[#1295D8]" />

          {/* Rules list */}
          <div className="p-4 space-y-1.5">
            {RULES.map((rule, i) => (
              <div key={i} className="flex gap-2 text-[9px] text-[#1A2B4A]">
                <span className="shrink-0 w-4 h-4 rounded-full bg-[#1295D8] text-white flex items-center justify-center font-bold text-[8px]">
                  {i + 1}
                </span>
                <p className="leading-tight">{rule}</p>
              </div>
            ))}
          </div>

          {/* Loss notice */}
          <div className="mx-4 mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5">
            <p className="text-[8px] text-amber-800 font-semibold text-center">
              ⚠️ If found, please return this card to Gnosis Kaksha, Ramkrishna Nagar, Karimganj, Assam – 788713
            </p>
          </div>

          {/* Student details summary on back */}
          <div className="border-t border-gray-200 mx-4 pt-2 pb-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[8px] text-[#1A2B4A]">
              <div><span className="text-gray-400 uppercase font-semibold">Name: </span>{profile.fullName}</div>
              <div><span className="text-gray-400 uppercase font-semibold">Reg. No: </span>{profile.registrationNumber}</div>
              <div><span className="text-gray-400 uppercase font-semibold">Class: </span>{profile.classNumber}</div>
              <div><span className="text-gray-400 uppercase font-semibold">Contact: </span>{profile.mobile}</div>
            </div>
          </div>

          {/* Back footer */}
          <div className="bg-[#1A2B4A] text-white px-4 py-1.5 flex items-center justify-between text-[8px]">
            <span className="flex items-center gap-1"><Calendar size={8} /> Valid: 2026–2027</span>
            <span>gnosiskaksha.cloud</span>
          </div>
        </div>
      </div>

      {/* ============================================================
          PROFILE DETAILS (hidden when printing)
          ============================================================ */}
      <div className="print:hidden">
        {/* Identity header */}
        <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7] text-[#1295D8]">
            <User size={40} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-bold text-[#1A2B4A]">{profile.fullName}</h2>
              <Badge tone="green">Active Enrolled</Badge>
            </div>
            <p className="font-mono text-sm font-semibold text-[#1295D8] mt-0.5">{profile.registrationNumber}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge tone="blue">Class {profile.classNumber}</Badge>
              {profile.stream && <Badge tone="gray">{profile.stream}</Badge>}
              <Badge tone="gray">{profile.board}</Badge>
            </div>
          </div>
        </div>

        {/* Profile & Contact Details Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-6">
          <SectionCard title="Academic Details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full Name" value={profile.fullName} />
              <Field label="Registration Number" value={profile.registrationNumber} />
              <Field label="Class" value={`Class ${profile.classNumber}`} />
              <Field label="Stream" value={profile.stream ?? 'General'} />
              <Field label="Board" value={profile.board} />
              <Field label="Admission Date" value={formatDate(profile.admissionDate)} />
            </dl>
          </SectionCard>

          <SectionCard title="Contact & Guardian Details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Student Mobile" value={profile.mobile} />
              <Field label="Email" value={profile.email} />
              <Field label="Father / Guardian" value={profile.parentName} />
              <Field label="Guardian Mobile" value={profile.guardianMobile} />
              <div className="sm:col-span-2">
                <Field label="Permanent Address" value={profile.address} />
              </div>
            </dl>
          </SectionCard>
        </div>
      </div>

      {/* ── Global print styles ── */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #id-card-print, #id-card-print * { visibility: visible !important; }
          #id-card-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}

/* ── helper sub-components ── */
function InfoRow({
  label,
  value,
  bold,
  mono,
  small,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <p className="text-[8px] text-gray-400 uppercase font-semibold leading-none">{label}</p>
      <p
        className={`leading-tight mt-0.5 text-[#1A2B4A] ${
          bold ? 'font-bold text-xs' : mono ? 'font-mono font-bold text-[10px] text-[#1295D8]' : small ? 'text-[9px]' : 'text-[10px] font-medium'
        }`}
      >
        {value || '—'}
      </p>
    </div>
  );
}

/* ── Rules & Regulations content ── */
const RULES: string[] = [
  'This card is the property of Gnosis Kaksha and must be carried at all times within the institute premises.',
  'This card is non-transferable. Misuse or lending of this card will lead to immediate cancellation and disciplinary action.',
  'Students must show this card on demand to any faculty member or administrative staff.',
  'In case of loss or damage, a duplicate card can be obtained by paying the applicable fee at the administration office.',
  'Students are expected to maintain discipline, punctuality, and decorum inside and outside the institute.',
  'Ragging, bullying, or any form of harassment is strictly prohibited and is punishable by expulsion.',
  'Mobile phones must be kept on silent mode or switched off during class hours.',
  'Students must complete all assignments and appear in all scheduled tests. Absence requires prior written permission.',
  'Fees must be paid by the 10th of every month. Late payment attracts a fine as per institute policy.',
  'The institute reserves the right to cancel enrollment if a student fails to comply with the institute\'s code of conduct.',
];
