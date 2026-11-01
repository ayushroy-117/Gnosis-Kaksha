'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, HelpCircle, Lightbulb, RotateCcw, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { SolutionCard, type Solution } from '@/components/dashboard/SolutionCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useApi, apiFetch } from '@/hooks/useApi';
import { SUBJECT_FEES } from '@/lib/fees';
import { canTeach, type TeacherData } from '@/lib/institute-data';

interface Doubt {
  id: string;
  studentName: string;
  registrationNumber: string;
  branchId: string;
  classNumber: number;
  subject: string;
  teacherName: string | null;
  question: string;
  imageUrl: string | null;
  status: 'open' | 'answered';
  createdAt: string;
}

const CLASSES = Object.keys(SUBJECT_FEES).map(Number).sort((a, b) => a - b);

export default function TeacherDoubtsPage() {
  const { data, error, loading, reload } = useApi<{ doubts: Doubt[] }>('/api/doubts');
  const { data: sol, reload: reloadSol, setData: setSol } = useApi<{ solutions: Solution[] }>('/api/doubt-solutions');
  const { data: teacher } = useApi<TeacherData>('/api/data/teacher');
  const scope = teacher?.assignments ?? null;
  const slots = useMemo(
    () => CLASSES.flatMap((c) => Object.keys(SUBJECT_FEES[c] ?? {}).filter((s) => canTeach(scope, s, c)).map((s) => ({ classNumber: c, subject: s }))),
    [scope]
  );
  const branches = useMemo(() => [...new Map((teacher?.roster ?? []).map((s) => [s.branchId, s.branchName])).entries()], [teacher]);

  const [filter, setFilter] = useState<'open' | 'answered'>('open');
  const [form, setForm] = useState<{ doubtId?: string; slot: string; title: string; note: string; linkUrl: string; branchId: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  if (loading && !data) return <LoadingState label="Loading doubts…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load doubts.'} onRetry={reload} />;

  const doubts = data.doubts.filter((d) => d.status === filter);
  const openCount = data.doubts.filter((d) => d.status === 'open').length;

  const answer = (d?: Doubt) => {
    setFile(null);
    setForm({
      doubtId: d?.id,
      slot: d ? `${d.classNumber}|${d.subject}` : slots[0] ? `${slots[0].classNumber}|${slots[0].subject}` : '',
      title: d ? `Solution: ${d.question.slice(0, 60)}` : '',
      note: '',
      linkUrl: '',
      branchId: d?.branchId ?? branches[0]?.[0] ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setStatus = async (d: Doubt, status: 'open' | 'answered') => {
    try {
      await apiFetch('/api/doubts', { method: 'PATCH', json: { id: d.id, status } });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update');
    }
  };

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const [classNumber, subject] = form.slot.split('|');
    const body = new FormData();
    body.append('classNumber', classNumber);
    body.append('subject', subject);
    body.append('title', form.title);
    body.append('note', form.note);
    body.append('linkUrl', form.linkUrl);
    if (form.doubtId) body.append('doubtId', form.doubtId);
    if (scope === null && form.branchId) body.append('branchId', form.branchId);
    if (file) body.append('file', file);
    setPosting(true);
    try {
      await apiFetch('/api/doubt-solutions', { method: 'POST', body });
      toast.success('Solution sent to the whole class. Students have been notified.');
      setForm(null);
      reload();
      reloadSol();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post the solution');
    } finally {
      setPosting(false);
    }
  };

  const remove = async (s: Solution) => {
    if (!confirm(`Delete "${s.title}"?`)) return;
    try {
      await apiFetch(`/api/doubt-solutions?id=${s.id}`, { method: 'DELETE' });
      setSol((prev) => (prev ? { solutions: prev.solutions.filter((x) => x.id !== s.id) } : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Doubt Support</h1>
          <p className="mt-1 text-[#4A5568]">Students&apos; doubts for your subjects. Post a solution (photo, PDF, short video or a video link) and the whole class at that branch gets it.</p>
        </div>
        <Button type="button" onClick={() => answer()} disabled={!slots.length} className="inline-flex items-center gap-1.5 self-start"><Upload size={16} /> Post solution to a class</Button>
      </div>

      {form && (
        <SectionCard title={form.doubtId ? 'Answer doubt' : 'Post a solution'}>
          <form onSubmit={post} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[#1A2B4A]">
                Class &amp; subject
                <select value={form.slot} disabled={!!form.doubtId} onChange={(e) => setForm({ ...form, slot: e.target.value })} className="mt-1 w-full rounded-lg border-2 border-gray-300 px-2 py-2 text-sm">
                  {slots.map((s) => <option key={`${s.classNumber}|${s.subject}`} value={`${s.classNumber}|${s.subject}`}>Class {s.classNumber} · {s.subject}</option>)}
                </select>
              </label>
              {scope === null && !form.doubtId && (
                <label className="block text-sm font-medium text-[#1A2B4A]">
                  Branch
                  <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="mt-1 w-full rounded-lg border-2 border-gray-300 px-2 py-2 text-sm">
                    {branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </label>
              )}
            </div>
            <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required minLength={3} />
            <label className="block text-sm font-medium text-[#1A2B4A]">
              Explanation (optional)
              <textarea rows={4} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1 w-full rounded-lg border-2 border-gray-300 p-2 text-sm" />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[#1A2B4A]">
                File <span className="font-normal text-gray-500">(JPG/PNG, PDF or MP4 up to 10 MB)</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full rounded-lg border-2 border-dashed border-gray-300 p-2 text-xs" />
              </label>
              <Input label="Or video link (YouTube / Drive)" placeholder="https://" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit" isLoading={posting}>Send to class</Button>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard
        title={`Doubts (${openCount} waiting)`}
        action={
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-semibold">
            {(['open', 'answered'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 ${filter === f ? 'bg-white text-[#1295D8] shadow-xs' : 'text-gray-600'}`}>
                {f === 'open' ? 'Waiting' : 'Answered'}
              </button>
            ))}
          </div>
        }
        bodyClassName="p-0"
      >
        {doubts.length === 0 ? (
          <div className="p-6"><EmptyState icon={HelpCircle} title={filter === 'open' ? 'No doubts waiting' : 'No answered doubts yet'} /></div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {doubts.map((d) => (
              <li key={d.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row">
                {d.imageUrl && (
                  <a href={d.imageUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated API image */}
                    <img src={d.imageUrl} alt="Doubt" className="h-24 w-24 rounded-lg border border-gray-200 object-cover" />
                  </a>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#1A2B4A]">{d.question}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {d.studentName} ({d.registrationNumber}) · Class {d.classNumber} · {d.subject} · asked {d.teacherName ? `to ${d.teacherName}` : ''} · {new Date(d.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  {d.status === 'open' ? (
                    <>
                      <Button type="button" size="sm" onClick={() => answer(d)} className="inline-flex items-center gap-1"><Lightbulb size={14} /> Answer</Button>
                      <button type="button" onClick={() => setStatus(d, 'answered')} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50" title="Mark answered without a solution"><CheckCircle2 size={17} /></button>
                    </>
                  ) : (
                    <>
                      <Badge tone="green">Answered</Badge>
                      <button type="button" onClick={() => setStatus(d, 'open')} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title="Reopen"><RotateCcw size={15} /></button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[#1A2B4A]">Solutions you posted</h2>
        {(sol?.solutions ?? []).length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Nothing posted yet.</p>
        ) : (
          sol!.solutions.map((s) => <SolutionCard key={s.id} s={s} onDelete={() => remove(s)} />)
        )}
      </section>
    </div>
  );
}
