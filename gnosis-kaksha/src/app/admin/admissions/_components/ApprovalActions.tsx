'use client';

import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { approveAdmission, rejectAdmission } from '../actions';

interface ApprovalActionsProps {
  id: string;
  name: string;
  /** Called after a successful approve/reject so the page can reload. */
  onDone?: () => void;
}

const Spinner = () => (
  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
);

export function ApprovalActions({ id, name, onDone }: ApprovalActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const run = (kind: 'approve' | 'reject') => {
    if (kind === 'reject' && !confirm(`Reject ${name}'s application? Any admission payment awaiting review will also be rejected.`)) {
      return;
    }
    setAction(kind);
    startTransition(async () => {
      try {
        const res = kind === 'approve' ? await approveAdmission(id) : await rejectAdmission(id);
        if (res.ok) {
          toast.success(kind === 'approve' ? `${name} approved and enrolled.` : `${name}'s application was rejected.`);
          onDone?.();
        } else {
          toast.error(res.error ?? `Could not ${kind} ${name}.`);
        }
      } catch {
        toast.error(`Could not ${kind} ${name}. Check your connection and try again.`);
      } finally {
        setAction(null);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => run('approve')}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0EA271] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending && action === 'approve' ? <Spinner /> : <Check size={16} />} Approve
      </button>
      <button
        type="button"
        onClick={() => run('reject')}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-[#4A5568] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending && action === 'reject' ? <Spinner /> : <X size={16} />} Reject
      </button>
    </div>
  );
}
