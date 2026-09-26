'use client';

import { SectionCard } from '@/components/dashboard/SectionCard';
import { SUBJECT_FEES, EXAM_FEE, TSHIRT_FEE } from '@/lib/fees';
import { formatINR } from '@/lib/institute-data';

const CLASS_FEES = Object.entries(SUBJECT_FEES)
  .map(([cls, subjects]) => ({
    classNumber: Number(cls),
    subjects: Object.entries(subjects).map(([subject, fee]) => ({ subject, fee })),
  }))
  .sort((a, b) => a.classNumber - b.classNumber);

export default function FeeStructurePage() {
  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Fee Structure</h1>
          <p className="mt-1 text-[#4A5568]">
            Monthly subject fees per class, used for all tuition calculations.
          </p>
          <p className="mt-1 text-xs text-[#718096]">
            Read-only: fees are set in the institute fee schedule and cannot be edited here.
          </p>
        </div>
      </div>

      {/* Mandatory charges */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">Examination Fee (fixed)</p>
          <p className="mt-1 text-2xl font-bold text-[#1A2B4A]">{formatINR(EXAM_FEE)}</p>
          <p className="text-xs text-[#718096] mt-0.5">Charged once at admission</p>
        </div>
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">T-Shirt Fee (fixed)</p>
          <p className="mt-1 text-2xl font-bold text-[#1A2B4A]">{formatINR(TSHIRT_FEE)}</p>
          <p className="text-xs text-[#718096] mt-0.5">Charged once at admission</p>
        </div>
      </div>

      {/* Per-class fee tables */}
      {CLASS_FEES.map(({ classNumber, subjects }) => (
        <SectionCard
          key={classNumber}
          title={`Class ${classNumber} — Monthly Subject Fees`}
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-6 py-3">Subject</th>
                  <th className="px-6 py-3 text-right">Fee (₹/month)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjects.map((r) => (
                  <tr key={r.subject} className="hover:bg-[#F7FAFC]">
                    <td className="px-6 py-3 font-medium text-[#1A2B4A]">{r.subject}</td>
                    <td className="px-6 py-3 text-right font-semibold text-[#1A2B4A]">{formatINR(r.fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
