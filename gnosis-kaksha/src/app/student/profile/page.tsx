'use client';

import { useMemo } from 'react';
import { User, Printer, ShieldCheck } from 'lucide-react';

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

export default function StudentProfilePage() {
  const { user } = useAuth();
  const { profile } = useMemo(() => {
    const identifier = user?.registrationNumber || user?.email || user?.id;
    return getStudentData(identifier);
  }, [user]);

  return (
    <div className="space-y-6">
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

      {/* DIGITAL STUDENT ID CARD */}
      <div className="max-w-md mx-auto rounded-2xl border-2 border-[#1295D8] bg-white shadow-xl overflow-hidden print:m-0 print:border print:shadow-none">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-[#1A2B4A] to-[#2E5EAA] text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-black tracking-wide text-base">GNOSIS KAKSHA</h3>
            <p className="text-[10px] text-[#CDE6F7] uppercase tracking-wider">Student Identity Card</p>
          </div>
          <span className="text-[10px] font-bold bg-[#1295D8] px-2 py-0.5 rounded text-white">
            2026–2027
          </span>
        </div>

        {/* Card Body */}
        <div className="p-5 flex gap-4 items-center">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-20 h-24 rounded-lg bg-[#F0F7FD] border-2 border-dashed border-[#1295D8] flex flex-col items-center justify-center text-[#1295D8] mb-2">
              <User size={32} />
              <span className="text-[9px] font-semibold mt-1">Photo</span>
            </div>
            <span className="text-[10px] font-bold text-[#2E5EAA]">CLASS {profile.classNumber}</span>
          </div>

          <div className="flex-1 space-y-1.5 text-xs">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Student Name</p>
              <p className="font-bold text-[#1A2B4A] text-sm leading-tight">{profile.fullName}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-semibold">Reg. Number</p>
              <p className="font-mono font-bold text-[#1295D8]">{profile.registrationNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Board</p>
                <p className="font-semibold text-gray-800">{profile.board}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-semibold">Emergency</p>
                <p className="font-semibold text-gray-800">{profile.guardianMobile}</p>
              </div>
            </div>
          </div>

          <div className="shrink-0 p-1 bg-white border border-gray-200 rounded">
            <QRCodeSVG value={`https://gnosiskaksha.in/verify/${profile.registrationNumber}`} size={64} level="L" />
          </div>
        </div>

        {/* Card Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-5 py-2 flex items-center justify-between text-[9px] text-gray-500">
          <span>Ramkrishna Nagar, Karimganj, Assam</span>
          <span className="flex items-center gap-1 font-semibold text-green-700">
            <ShieldCheck size={11} /> Verified Member
          </span>
        </div>
      </div>

      {/* Profile & Contact Details Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
            <Field label="Parent / Guardian" value={profile.parentName} />
            <Field label="Guardian Mobile" value={profile.guardianMobile} />
            <div className="sm:col-span-2">
              <Field label="Permanent Address" value={profile.address} />
            </div>
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}
