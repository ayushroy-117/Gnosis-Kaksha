import React from 'react';

interface SectionCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className = '',
  bodyClassName = '',
}: SectionCardProps) {
  return (
    <section
      className={`bg-white rounded-[12px] border border-gray-200 shadow-sm ${className}`}
    >
      <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#1A2B4A]">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-[#718096]">{description}</p>}
        </div>
        {action && <div className="sm:shrink-0">{action}</div>}
      </header>
      <div className={`px-6 py-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
