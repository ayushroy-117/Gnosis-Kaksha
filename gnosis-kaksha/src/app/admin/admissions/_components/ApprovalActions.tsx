'use client';

import { useTransition } from 'react';
import { Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { approveAdmission, rejectAdmission } from '../actions';

interface ApprovalActionsProps {
  id: string;
  name: string;
}

export function ApprovalActions({ id, name }: ApprovalActionsProps) {
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      const res = await approveAdmission(id);
      if (res.ok) toast.success(`${name} approved and enrolled.`);
      else toast.error(res.error ?? `Could not approve ${name}.`);
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      const res = await rejectAdmission(id);
      if (res.ok) toast.success(`${name}'s application was rejected.`);
      else toast.error(res.error ?? `Could not reject ${name}.`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleApprove}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0EA271] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Check size={16} /> Approve
      </button>
      <button
        type="button"
        onClick={handleReject}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-[#4A5568] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <X size={16} /> Reject
      </button>
    </div>
  );
}
