import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  sublabel?: string;
  /** Tailwind text color class for the value, e.g. "text-[#10B981]" */
  valueColor?: string;
  /** Tailwind color classes for the icon badge, e.g. "bg-[#CDE6F7] text-[#1295D8]" */
  iconClasses?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  valueColor = 'text-[#1295D8]',
  iconClasses = 'bg-[#CDE6F7] text-[#1295D8]',
}: StatCardProps) {
  return (
    <div className="bg-white rounded-[12px] border border-gray-200 shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#718096]">{label}</p>
          <p className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</p>
          {sublabel && <p className="mt-1 text-sm text-[#718096]">{sublabel}</p>}
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconClasses}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
