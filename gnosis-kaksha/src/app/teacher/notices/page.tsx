'use client';

import { useMemo, useState } from 'react';
import { Megaphone, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useApi, apiFetch } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';
import { SUBJECT_FEES } from '@/lib/fees';
import type { TeacherData } from '@/lib/institute-data';

interface ClassNotice {
  id: string;
  title: string;
  content: string;
  date: string;
  classNumber: number;
  branchName: string | null;
  issuedBy: string | null;
}

export default function TeacherNoticesPage() {
  const { data, error, loading, reload, setData } = useApi<{ notices: ClassNotice[] }>('/api/teacher/notices');
  const { data: teacher } = useApi<TeacherData>('/api/data/teacher');
  const scope = teacher?.assignments ?? null;
  const classes = useMemo(
    () => (scope === null ? Object.keys(SUBJECT_FEES).map(Number) : [...new Set(scope.map((a) => a.classNumber))]).sort((a, b) => a - b),
    [scope]
  );
  const branches = useMemo(() => [...new Map((teacher?.roster ?? []).map((s) => [s.branchId, s.branchName])).entries()], [teacher]);
  const [form, setForm] = useState({ title: '', content: '', classNumber: '', branchId: '' });
  const [sending, setSending] = useState(false);

  if (loading && !data) return <LoadingState label="Loading notices…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load notices.'} onRetry={reload} />;

  const classNumber = form.classNumber || String(classes[0] ?? '');
  const branchId = form.branchId || branches[0]?.[0] || '';

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const { notice } = await apiFetch<{ notice: ClassNotice }>('/api/teacher/notices', {
        method: 'POST',
        json: { title: form.title, content: form.content, classNumber: Number(classNumber), branchId: scope === null ? branchId : undefined },
      });
      setData((d) => ({ notices: [notice, ...(d?.notices ?? [])] }));
      setForm({ ...form, title: '', content: '' });
      toast.success(`Notice sent to Class ${classNumber}. Students have been notified.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the notice');
    } finally {
      setSending(false);
    }
  };

  const remove = async (n: ClassNotice) => {
    if (!confirm(`Delete the notice "${n.title}"?`)) return;
    try {
      await apiFetch(`/api/teacher/notices?id=${n.id}`, { method: 'DELETE' });
      setData((d) => (d ? { notices: d.notices.filter((x) => x.id !== n.id) } : d));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Class Notices</h1>
        <p className="mt-1 text-[#4A5568]">Send a notice to the students of a class you teach. It appears only in their student portal, never on the public website (home-page notices come from the admin).</p>
      </div>

      <SectionCard title="New notice">
        <form onSubmit={send} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[#1A2B4A]">
              Class
              <select value={classNumber} onChange={(e) => setForm({ ...form, classNumber: e.target.value })} className="mt-1 w-full rounded-lg border-2 border-gray-300 px-2 py-2 text-sm" required>
                {classes.map((c) => <option key={c} value={c}>Class {c}</option>)}
              </select>
            </label>
            {scope === null && (
              <label className="block text-sm font-medium text-[#1A2B4A]">
                Branch
                <select value={branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="mt-1 w-full rounded-lg border-2 border-gray-300 px-2 py-2 text-sm">
                  {branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>
            )}
          </div>
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} maxLength={200} />
          <label className="block text-sm font-medium text-[#1A2B4A]">
            Notice
            <textarea rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required minLength={3} maxLength={3000} className="mt-1 w-full rounded-lg border-2 border-gray-300 p-2 text-sm focus:border-[#1295D8] focus:outline-none" />
          </label>
          <div className="flex justify-end">
            <Button type="submit" isLoading={sending} disabled={!classes.length} className="inline-flex items-center gap-1.5"><Send size={15} /> Send to class</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Notices you sent" bodyClassName="p-0">
        {data.notices.length === 0 ? (
          <div className="p-6"><EmptyState icon={Megaphone} title="No notices sent yet" /></div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.notices.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#1A2B4A]">{n.title}</p>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-[#4A5568]">{n.content}</p>
                  <p className="mt-1 text-xs text-gray-500">Class {n.classNumber}{n.branchName ? ` · ${n.branchName}` : ''} · {formatDate(n.date)}{scope === null && n.issuedBy ? ` · ${n.issuedBy}` : ''}</p>
                </div>
                <button type="button" onClick={() => remove(n)} className="shrink-0 rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Delete notice"><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
