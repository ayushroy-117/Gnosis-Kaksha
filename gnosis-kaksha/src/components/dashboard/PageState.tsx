'use client';

import { AlertTriangle, RotateCw } from 'lucide-react';

/** Standard loading placeholder for dashboard pages and sections. */
export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-[#718096]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1295D8] border-t-transparent" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

/** Standard error block with a retry button. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-[12px] border border-red-200 bg-red-50 px-6 py-10 text-center">
      <AlertTriangle size={28} className="text-red-500" />
      <p className="max-w-md text-sm font-medium text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        >
          <RotateCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}
