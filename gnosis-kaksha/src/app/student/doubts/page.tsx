'use client';

import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Camera, HelpCircle, Lightbulb, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { SolutionCard, type Solution } from '@/components/dashboard/SolutionCard';
import { Button } from '@/components/ui/Button';
import { useApi, apiFetch } from '@/hooks/useApi';

interface Doubt {
  id: string;
  subject: string;
  teacherName: string | null;
  question: string;
  imageUrl: string | null;
  status: 'open' | 'answered';
  createdAt: string;
}
interface DoubtData {
  doubts: Doubt[];
  subjects: Array<{ subject: string; teachers: Array<{ id: string; name: string }> }>;
}

export default function StudentDoubtsPage() {
  const as = useSearchParams().get('as');
  const q = as ? `?as=${encodeURIComponent(as)}` : '';
  const { data, error, loading, reload } = useApi<DoubtData>(`/api/doubts${q}`);
  const { data: sol, reload: reloadSol } = useApi<{ solutions: Solution[] }>(`/api/doubt-solutions${q}`);
  const [subject, setSubject] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [question, setQuestion] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (loading && !data) return <LoadingState label="Loading doubt support…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load doubt support.'} onRetry={reload} />;

  const teachers = data.subjects.find((s) => s.subject === subject)?.teachers ?? [];
  const teacher = teachers.some((t) => t.id === teacherId) ? teacherId : teachers[0]?.id ?? '';

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !teacher) return toast.error('Choose the subject and teacher.');
    const body = new FormData();
    body.append('subject', subject);
    body.append('teacherId', teacher);
    body.append('question', question);
    if (image) body.append('image', image);
    setSending(true);
    try {
      await apiFetch('/api/doubts', { method: 'POST', body });
      toast.success('Doubt sent. Your teacher has been notified.');
      setQuestion('');
      setImage(null);
      if (fileRef.current) fileRef.current.value = '';
      reload();
      reloadSol();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send your doubt');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Doubt Support</h1>
        <p className="mt-1 text-[#4A5568]">Click a photo of the problem, write your doubt and send it to your subject teacher. Solutions are shared with your whole class.</p>
      </div>

      {!as && (
        <SectionCard title="Ask a doubt">
          <form onSubmit={send} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[#1A2B4A]">
                Subject
                <select value={subject} onChange={(e) => { setSubject(e.target.value); setTeacherId(''); }} className="mt-1 w-full rounded-lg border-2 border-gray-300 px-2 py-2 text-sm" required>
                  <option value="">Choose subject</option>
                  {data.subjects.map((s) => <option key={s.subject}>{s.subject}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-[#1A2B4A]">
                Teacher
                <select value={teacher} onChange={(e) => setTeacherId(e.target.value)} disabled={!subject || !teachers.length} className="mt-1 w-full rounded-lg border-2 border-gray-300 px-2 py-2 text-sm disabled:bg-gray-100" required>
                  {!teachers.length && <option value="">{subject ? 'No teacher assigned yet' : 'Choose subject first'}</option>}
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-[#1A2B4A]">
              Your doubt
              <textarea rows={4} value={question} onChange={(e) => setQuestion(e.target.value)} required minLength={5} maxLength={2000} placeholder="e.g. In question 7, how do we get the value of the resistance?" className="mt-1 w-full rounded-lg border-2 border-gray-300 p-2 text-sm focus:border-[#1295D8] focus:outline-none" />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-3 py-2 text-sm font-semibold text-[#1295D8] hover:bg-blue-50">
                <Camera size={16} /> {image ? 'Change photo' : 'Take / attach photo'}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => setImage(e.target.files?.[0] ?? null)} className="sr-only" />
              </label>
              {image && <span className="text-xs text-gray-600">{image.name} ({Math.round(image.size / 1024)} KB)</span>}
              <Button type="submit" isLoading={sending} className="ml-auto inline-flex items-center gap-1.5"><Send size={15} /> Send doubt</Button>
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard title="My doubts" bodyClassName="p-0">
        {data.doubts.length === 0 ? (
          <div className="p-6"><EmptyState icon={HelpCircle} title="No doubts asked yet" /></div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.doubts.map((d) => (
              <li key={d.id} className="flex gap-3 px-5 py-3">
                {d.imageUrl && (
                  <a href={d.imageUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated API image */}
                    <img src={d.imageUrl} alt="Doubt" className="h-16 w-16 rounded-lg border border-gray-200 object-cover" />
                  </a>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#1A2B4A]">{d.question}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{d.subject} · to {d.teacherName ?? 'teacher'} · {new Date(d.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <Badge tone={d.status === 'answered' ? 'green' : 'amber'}>{d.status === 'answered' ? 'Answered' : 'Waiting'}</Badge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#1A2B4A]"><Lightbulb size={18} className="text-amber-500" /> Solutions for your class</h2>
        {(sol?.solutions ?? []).length === 0 ? (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">No solutions posted yet.</p>
        ) : (
          sol!.solutions.map((s) => <SolutionCard key={s.id} s={s} />)
        )}
      </section>
    </div>
  );
}
