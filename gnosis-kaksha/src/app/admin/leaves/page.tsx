'use client';

import { useState } from 'react';
import { CalendarDays, Check, Paperclip, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { LEAVE_STATUS } from '@/components/staff/LeavePanel';
import { useApi, apiFetch } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';
import { LEAVE_TYPES, type LeaveRequest } from '@/lib/leave';

export default function AdminLeavesPage() {
  const { data, error, loading, reload } = useApi<{ leaves: LeaveRequest[] }>('/api/leaves?all=1');
  const [busy, setBusy] = useState<string | null>(null);

  if (loading && !data) return <LoadingState label="Loading leave requests…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load leave requests.'} onRetry={reload} />;

  const pending = data.leaves.filter((l) => l.status === 'pending');
  const decided = data.leaves.filter((l) => l.status !== 'pending');

  const decide = async (l: LeaveRequest, action: 'approve' | 'reject') => {
    const note = action === 'reject' ? prompt('Reason for rejecting (shown to the staff member):') ?? undefined : undefined;
    if (action === 'reject' && note === undefined) return;
    setBusy(l.id);
    try {
      await apiFetch('/api/leaves', { method: 'PATCH', json: { id: l.id, action, note } });
      toast.success(`Leave ${action === 'approve' ? 'approved' : 'rejected'}. ${l.staffName} has been notified.`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update');
    } finally {
      setBusy(null);
    }
  };

  const Row = ({ l, actions }: { l: LeaveRequest; actions: boolean }) => (
    <tr>
      <td className="px-5 py-3 font-semibold text-[#1A2B4A]">{l.staffName}</td>
      <td className="px-5 py-3">{formatDate(l.fromDate)}{l.toDate !== l.fromDate ? ` – ${formatDate(l.toDate)}` : ''}</td>
      <td className="px-5 py-3">{LEAVE_TYPES[l.leaveType]} · {l.halfDay ? '½ day' : `${l.days} day${l.days === 1 ? '' : 's'}`}</td>
      <td className="max-w-xs px-5 py-3 text-gray-600">
        {l.reason}
        {l.documentUrl && <a href={l.documentUrl} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex text-[#1295D8]" title="Supporting document"><Paperclip size={13} /></a>}
        {l.decisionNote && <p className="text-xs text-gray-500">Note: {l.decisionNote}</p>}
      </td>
      <td className="whitespace-nowrap px-5 py-3 text-right">
        {actions ? (
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" onClick={() => decide(l, 'approve')} disabled={busy === l.id} className="inline-flex items-center gap-1"><Check size={14} /> Approve</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => decide(l, 'reject')} disabled={busy === l.id} className="inline-flex items-center gap-1 border-red-300 text-red-600 hover:bg-red-50"><X size={14} /> Reject</Button>
          </div>
        ) : (
          <span className="flex flex-col items-end gap-0.5">
            <Badge tone={LEAVE_STATUS[l.status].tone}>{LEAVE_STATUS[l.status].label}</Badge>
            {l.decidedBy && <span className="text-[10px] text-gray-500">by {l.decidedBy}</span>}
          </span>
        )}
      </td>
    </tr>
  );

  const head = (
    <thead>
      <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
        <th className="px-5 py-3">Staff</th>
        <th className="px-5 py-3">Dates</th>
        <th className="px-5 py-3">Type</th>
        <th className="px-5 py-3">Reason</th>
        <th className="px-5 py-3 text-right">Decision</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Staff Leave</h1>
        <p className="mt-1 text-[#4A5568]">Approve or reject leave requests from teachers and accountants. They are notified of your decision.</p>
      </div>
      <SectionCard title={`Waiting for approval (${pending.length})`} bodyClassName="p-0">
        {pending.length === 0 ? (
          <div className="p-6"><EmptyState icon={CalendarDays} title="No pending requests" /></div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">{head}<tbody className="divide-y divide-gray-100">{pending.map((l) => <Row key={l.id} l={l} actions />)}</tbody></table></div>
        )}
      </SectionCard>
      <SectionCard title="History" bodyClassName="p-0">
        {decided.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No decided requests yet.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">{head}<tbody className="divide-y divide-gray-100">{decided.map((l) => <Row key={l.id} l={l} actions={false} />)}</tbody></table></div>
        )}
      </SectionCard>
    </div>
  );
}
