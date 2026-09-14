'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';

export function SampleDataBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <Info size={18} className="mt-0.5 shrink-0 text-amber-600" />
      <p className="flex-1 text-sm text-amber-800">
        <span className="font-semibold">Sample data.</span> This portal is showing
        illustrative content. Live student records will appear here once the database is
        connected.
      </p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="shrink-0 rounded p-0.5 text-amber-600 transition hover:bg-amber-100"
      >
        <X size={16} />
      </button>
    </div>
  );
}
