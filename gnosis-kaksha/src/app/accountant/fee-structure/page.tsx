'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Button } from '@/components/ui/Button';
import { SUBJECT_FEES, EXAM_FEE, TSHIRT_FEE } from '@/lib/fees';
import { formatINR } from '@/lib/institute-data';
import toast from 'react-hot-toast';

export default function FeeStructurePage() {
  // Flatten SUBJECT_FEES into editable rows
  const initialRows = Object.entries(SUBJECT_FEES).flatMap(([cls, subjects]) =>
    Object.entries(subjects).map(([subject, fee]) => ({
      key: `${cls}-${subject}`,
      classNumber: Number(cls),
      subject,
      fee,
      editedFee: fee,
    }))
  );

  const [rows, setRows] = useState(initialRows);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleFeeChange = (key: string, value: string) => {
    const num = parseInt(value, 10);
    setRows((prev) =>
      prev.map((r) =>
        r.key === key ? { ...r, editedFee: isNaN(num) ? r.editedFee : num } : r
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // In a real app, this would persist to DB. Here we show success feedback.
    await new Promise((res) => setTimeout(res, 600));
    setHasChanges(false);
    setIsSaving(false);
    toast.success('Fee structure updated (demo — not persisted across reload)');
  };

  const groupedByClass = rows.reduce<Record<number, typeof rows>>((acc, r) => {
    if (!acc[r.classNumber]) acc[r.classNumber] = [];
    acc[r.classNumber].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <SampleDataBanner />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Fee Structure</h1>
          <p className="mt-1 text-[#4A5568]">
            View and edit monthly subject fees per class. Changes are reflected immediately for new billing calculations.
          </p>
        </div>
        {hasChanges && (
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
          >
            <Save size={16} className="mr-1" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Mandatory charges */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">Examination Fee (fixed)</p>
          <p className="mt-1 text-2xl font-bold text-[#1A2B4A]">{formatINR(EXAM_FEE)}</p>
          <p className="text-xs text-[#718096] mt-0.5">Charged once at admission · Non-editable in demo</p>
        </div>
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">T-Shirt Fee (fixed)</p>
          <p className="mt-1 text-2xl font-bold text-[#1A2B4A]">{formatINR(TSHIRT_FEE)}</p>
          <p className="text-xs text-[#718096] mt-0.5">Charged once at admission · Non-editable in demo</p>
        </div>
      </div>

      {/* Per-class fee tables */}
      {Object.entries(groupedByClass)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([cls, subjectRows]) => (
          <SectionCard
            key={cls}
            title={`Class ${cls} — Monthly Subject Fees`}
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                    <th className="px-6 py-3">Subject</th>
                    <th className="px-6 py-3 text-right">Current Fee</th>
                    <th className="px-6 py-3 text-right">Edit Fee (₹/month)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subjectRows.map((r) => (
                    <tr key={r.key} className="hover:bg-[#F7FAFC]">
                      <td className="px-6 py-3 font-medium text-[#1A2B4A]">{r.subject}</td>
                      <td className="px-6 py-3 text-right text-[#4A5568]">{formatINR(r.fee)}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[#718096]">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={r.editedFee}
                            onChange={(e) => handleFeeChange(r.key, e.target.value)}
                            className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-right text-sm font-semibold text-[#1A2B4A] focus:outline-hidden focus:ring-2 focus:ring-[#1295D8] focus:border-[#1295D8]"
                          />
                        </div>
                      </td>
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
