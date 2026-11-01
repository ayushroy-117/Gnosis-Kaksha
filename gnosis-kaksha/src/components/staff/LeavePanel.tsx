'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Info, Paperclip, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/dashboard/Badge';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useApi, apiFetch } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';
import { LEAVE_POLICY, LEAVE_TYPES, leaveDates, type LeaveRequest, type LeaveType } from '@/lib/leave';

interface LeaveData {
  leaves: LeaveRequest[];
  balance: { total: number; used: number; pending: number; remaining: number };
}

export const LEAVE_STATUS = {
  pending: { tone: 'amber' as const, label: 'Pending' },
  approved: { tone: 'green' as const, label: 'Approved' },
  rejected: { tone: 'red' as const, label: 'Rejected' },
  cancelled: { tone: 'gray' as const, label: 'Cancelled' },
};

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function Calendar({ leaves }: { leaves: LeaveRequest[] }) {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const byDate = useMemo(() => {
    const m = new Map<string, LeaveRequest['status']>();
    for (const l of leaves) if (l.status !== 'cancelled') for (const d of leaveDates(l.fromDate, l.toDate)) m.set(d, l.status);
    return m;
  }, [leaves]);
  const first = cursor.getDay();
  const daysIn = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: daysIn }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1))];
  const today = ymd(new Date());
  const tone = { approved: 'bg-blue-100 text-blue-800', pending: 'bg-amber-100 text-amber-800', rejected: 'bg-red-100 text-red-700', cancelled: '' };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-semibold text-[#1A2B4A]">{cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded p-1 hover:bg-gray-100" aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded p-1 hover:bg-gray-100" aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-1 font-semibold text-gray-500">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const key = ymd(d);
          const st = byDate.get(key);
          return (
            <div key={key} className={`rounded-md py-1.5 ${st ? tone[st] : d.getDay() === 0 ? 'text-gray-300' : 'text-gray-700'} ${key === today ? 'ring-2 ring-[#1295D8]' : ''}`}>
              {d.getDate()}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-100" /> On leave (approved)</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-100" /> Pending</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-100" /> Rejected</span>
      </div>
    </div>
  );
}

export function LeavePanel() {
  const { data, error, loading, reload } = useApi<LeaveData>('/api/leaves');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leaveType: 'casual' as LeaveType, fromDate: '', toDate: '', halfDay: false, reason: '' });
  const [doc, setDoc] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading && !data) return <LoadingState label="Loading leave…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load leave.'} onRetry={reload} />;

  const { leaves, balance } = data;
  const upcoming = leaves.filter((l) => (l.status === 'pending' || l.status === 'approved') && l.toDate >= ymd(new Date())).slice(0, 4);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = new FormData();
    body.append('leaveType', form.leaveType);
    body.append('fromDate', form.fromDate);
    body.append('toDate', form.halfDay ? form.fromDate : form.toDate || form.fromDate);
    body.append('halfDay', String(form.halfDay));
    body.append('reason', form.reason);
    if (doc) body.append('document', doc);
    setSaving(true);
    try {
      await apiFetch('/api/leaves', { method: 'POST', body });
      toast.success('Leave request submitted for approval');
      setOpen(false);
      setForm({ leaveType: 'casual', fromDate: '', toDate: '', halfDay: false, reason: '' });
      setDoc(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (l: LeaveRequest) => {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await apiFetch('/api/leaves', { method: 'PATCH', json: { id: l.id, action: 'cancel' } });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Leave Management</h1>
          <p className="mt-1 text-[#4A5568]">Apply for leave, track your requests and view your leave history.</p>
        </div>
        <Button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 self-start"><Plus size={16} /> Apply for leave</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Total casual leave" value={`${balance.total} days`} sublabel="per year" />
        <StatCard icon={CalendarDays} label="Used" value={`${balance.used} days`} />
        <StatCard icon={Clock} label="Pending approval" value={`${leaves.filter((l) => l.status === 'pending').length} request(s)`} />
        <StatCard icon={CalendarDays} label="Remaining" value={`${balance.remaining} days`} />
      </div>

      {open && (
        <SectionCard title="Apply for leave" action={<button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100" aria-label="Close"><X size={18} /></button>}>
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm font-medium text-[#1A2B4A]">
              Leave type
              <select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value as LeaveType })} className="mt-1 w-full rounded-lg border-2 border-gray-300 px-2 py-2 text-sm">
                {Object.entries(LEAVE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <div className="flex gap-4 text-sm">
              {[false, true].map((h) => (
                <label key={String(h)} className="inline-flex items-center gap-1.5">
                  <input type="radio" checked={form.halfDay === h} onChange={() => setForm({ ...form, halfDay: h })} className="accent-[#1295D8]" /> {h ? 'Half day' : 'Full day(s)'}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label={form.halfDay ? 'Date' : 'From date'} type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} required />
              {!form.halfDay && <Input label="To date" type="date" min={form.fromDate} value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} required />}
            </div>
            <label className="block text-sm font-medium text-[#1A2B4A]">
              Reason
              <textarea rows={3} maxLength={500} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} required className="mt-1 w-full rounded-lg border-2 border-gray-300 p-2 text-sm" />
            </label>
            <label className="block text-sm font-medium text-[#1A2B4A]">
              Supporting document <span className="font-normal text-gray-500">(optional, PDF/JPG/PNG up to 5 MB)</span>
              <input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setDoc(e.target.files?.[0] ?? null)} className="mt-1 block w-full rounded-lg border-2 border-dashed border-gray-300 p-2 text-xs" />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={saving}>Submit request</Button>
            </div>
          </form>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title="Leave calendar"><Calendar leaves={leaves} /></SectionCard>
        <div className="space-y-6">
          <SectionCard title="Upcoming leave">
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-500">None.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {upcoming.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2">
                    <span>{formatDate(l.fromDate)}{l.toDate !== l.fromDate ? ` – ${formatDate(l.toDate)}` : ''} <span className="text-xs text-gray-500">· {LEAVE_TYPES[l.leaveType]} ({l.days} day{l.days === 1 ? '' : 's'})</span></span>
                    <Badge tone={LEAVE_STATUS[l.status].tone}>{LEAVE_STATUS[l.status].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title="Leave policy">
            <ul className="space-y-1.5 text-sm text-[#4A5568]">
              {LEAVE_POLICY.map((p) => <li key={p} className="flex gap-2"><Info size={14} className="mt-0.5 shrink-0 text-[#1295D8]" /> {p}</li>)}
            </ul>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Leave history" bodyClassName="p-0">
        {leaves.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No leave requests yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-5 py-3">Dates</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Applied</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-2.5 font-medium">{formatDate(l.fromDate)}{l.toDate !== l.fromDate ? ` – ${formatDate(l.toDate)}` : ''}</td>
                    <td className="px-5 py-2.5">{LEAVE_TYPES[l.leaveType]}</td>
                    <td className="px-5 py-2.5">{l.halfDay ? '½ Day' : `${l.days} day${l.days === 1 ? '' : 's'}`}</td>
                    <td className="max-w-xs px-5 py-2.5 text-gray-600">
                      {l.reason}
                      {l.documentUrl && <a href={l.documentUrl} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex text-[#1295D8]" title="Document"><Paperclip size={13} /></a>}
                      {l.decisionNote && <p className="text-xs text-gray-500">Note: {l.decisionNote}</p>}
                    </td>
                    <td className="px-5 py-2.5"><Badge tone={LEAVE_STATUS[l.status].tone}>{LEAVE_STATUS[l.status].label}</Badge></td>
                    <td className="px-5 py-2.5 text-xs text-gray-500">{formatDate(l.createdAt.slice(0, 10))}</td>
                    <td className="px-5 py-2.5 text-right">
                      {l.status === 'pending' && <button type="button" onClick={() => cancel(l)} className="text-xs font-semibold text-red-600 hover:underline">Cancel</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
