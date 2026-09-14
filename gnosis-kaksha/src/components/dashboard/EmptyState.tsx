import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-[#F7FAFC] px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#CDE6F7] text-[#1295D8]">
        <Icon size={26} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[#1A2B4A]">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-[#718096]">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
