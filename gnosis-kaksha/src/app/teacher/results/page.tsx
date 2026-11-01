'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useApi, apiFetch } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';
import { SUBJECT_FEES } from '@/lib/fees';
import { canTeach, type TeacherData } from '@/lib/institute-data';

interface Test {
  id: string;
  branchId: string;
  classNumber: number;
  subject: string;
  testType: 'weekly' | 'monthly' | 'other';
  title: string;
  testDate: string;
  maxMarks: number;
  createdByName: string;
  marks: Array<{ studentId: string; marks: number | null; absent: boolean }>;
  stats: { appeared: number; average: number | null; highest: number | null };
}
type Row = { studentId: string; name: string; reg: string; marks: string; absent: boolean };

const TYPE_LABEL = { weekly: 'Weekly test', monthly: 'Monthly test', other: 'Other test' };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const CLASSES = Object.keys(SUBJECT_FEES).map(Number).sort((a, b) => a - b);

export default function TeacherResultsPage() {
  const { data: teacher, error: tErr, loading: tLoading, reload: tReload } = useApi<TeacherData>('/api/data/teacher');
  const scope = teacher?.assignments ?? null;
  const branches = useMemo(() => [...new Map((teacher?.roster ?? []).map((s) => [s.branchId, s.branchName])).entries()], [teacher]);
  const classes = CLASSES.filter((c) => Object.keys(SUBJECT_FEES[c] ?? {}).some((s) => canTeach(scope, s, c)));
  const [cls, setCls] = useState<number | null>(null);
  const [subject, setSubject] = useState('');
  const [branchId, setBranchId] = useState('');
  const classNumber = cls ?? classes[0] ?? null;
  const subjects = classNumber ? Object.keys(SUBJECT_FEES[classNumber] ?? {}).filter((s) => canTeach(scope, s, classNumber)) : [];
  const sub = subjects.includes(subject) ? subject : subjects[0] ?? '';
  const branch = branchId || branches[0]?.[0] || '';

  const query = classNumber && sub ? `/api/results?classNumber=${classNumber}&subject=${encodeURIComponent(sub)}${scope === null && branch ? `&branchId=${branch}` : ''}` : null;
  const { data, error, loading, reload } = useApi<{ tests: Test[] }>(query);

  const [editing, setEditing] = useState<{ id?: string; title: string; testType: Test['testType']; testDate: string; maxMarks: string; rows: Row[] } | null>(null);
  const [saving, setSaving] = useState(false);

  if (tLoading && !teacher) return <LoadingState label="Loading…" />;
  if (tErr || !teacher) return <ErrorState message={tErr?.message ?? 'Could not load your classes.'} onRetry={tReload} />;

  const students = teacher.roster
    .filter((s) => s.classNumber === classNumber && s.subjects.some((x) => x.toLowerCase() === sub.toLowerCase()) && (scope !== null || s.branchId === branch))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  const openNew = () =>
    setEditing({ title: '', testType: 'weekly', testDate: today(), maxMarks: '25', rows: students.map((s) => ({ studentId: s.id, name: s.fullName, reg: s.registrationNumber, marks: '', absent: false })) });

  const openEdit = (t: Test) => {
    const byId = new Map(t.marks.map((m) => [m.studentId, m]));
    setEditing({
      id: t.id,
      title: t.title,
      testType: t.testType,
      testDate: t.testDate,
      maxMarks: String(t.maxMarks),
      rows: students.map((s) => {
        const m = byId.get(s.id);
        return { studentId: s.id, name: s.fullName, reg: s.registrationNumber, marks: m?.marks != null ? String(m.marks) : '', absent: m?.absent ?? false };
      }),
    });
  };

  const save = async () => {
    if (!editing || !classNumber) return;
    const missing = editing.rows.filter((r) => !r.absent && r.marks.trim() === '');
    if (missing.length && !confirm(`${missing.length} student(s) have no marks and are not marked absent. Save them as absent?`)) return;
    const marks = editing.rows.map((r) => ({ studentId: r.studentId, absent: r.absent || r.marks.trim() === '', marks: r.absent || r.marks.trim() === '' ? null : Number(r.marks) }));
    setSaving(true);
    try {
      if (editing.id) {
        await apiFetch('/api/results', { method: 'PUT', json: { id: editing.id, title: editing.title, testDate: editing.testDate, maxMarks: Number(editing.maxMarks), marks } });
        toast.success('Marks updated');
      } else {
        await apiFetch('/api/results', {
          method: 'POST',
          json: { classNumber, subject: sub, testType: editing.testType, title: editing.title, testDate: editing.testDate, maxMarks: Number(editing.maxMarks), branchId: scope === null ? branch : undefined, marks },
        });
        toast.success('Result published. Students have been notified.');
      }
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: Test) => {
    if (!confirm(`Delete "${t.title}" and all its marks?`)) return;
    try {
      await apiFetch(`/api/results?id=${t.id}`, { method: 'DELETE' });
      toast.success('Test deleted');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete');
    }
  };

  const select = 'rounded-lg border-2 border-gray-300 bg-white px-2 py-1.5 text-sm';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Results &amp; Performance</h1>
          <p className="mt-1 text-[#4A5568]">Upload weekly and monthly test marks. Students instantly see their marks, percentage, rank and progress report.</p>
        </div>
        <Button type="button" onClick={openNew} disabled={!sub || students.length === 0} className="inline-flex items-center gap-1.5 self-start">
          <Plus size={16} /> New test
        </Button>
      </div>

      {classes.length === 0 ? (
        <EmptyState icon={BarChart3} title="No subjects assigned to you yet" message="Ask the admin to assign your subjects and classes." />
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <label className="text-xs font-semibold text-gray-500">Class <select value={classNumber ?? ''} onChange={(e) => setCls(Number(e.target.value))} className={select}>{classes.map((c) => <option key={c} value={c}>Class {c}</option>)}</select></label>
          <label className="text-xs font-semibold text-gray-500">Subject <select value={sub} onChange={(e) => setSubject(e.target.value)} className={select}>{subjects.map((s) => <option key={s}>{s}</option>)}</select></label>
          {scope === null && branches.length > 0 && (
            <label className="text-xs font-semibold text-gray-500">Branch <select value={branch} onChange={(e) => setBranchId(e.target.value)} className={select}>{branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          )}
          <span className="text-xs text-gray-500">{students.length} student{students.length === 1 ? '' : 's'} take {sub || 'this subject'}</span>
        </div>
      )}

      {editing && (
        <SectionCard title={editing.id ? `Edit marks — ${editing.title}` : `New ${sub} test — Class ${classNumber}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Input label="Test name" placeholder="e.g. Weekly Test 3 — Light" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <label className="block text-sm font-medium text-[#1A2B4A]">
                Type
                <select value={editing.testType} disabled={!!editing.id} onChange={(e) => setEditing({ ...editing, testType: e.target.value as Test['testType'] })} className="mt-1 w-full rounded-lg border-2 border-gray-300 px-2 py-2 text-sm">
                  {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <Input label="Test date" type="date" value={editing.testDate} onChange={(e) => setEditing({ ...editing, testDate: e.target.value })} />
              <Input label="Full marks" type="number" min={1} value={editing.maxMarks} onChange={(e) => setEditing({ ...editing, maxMarks: e.target.value })} />
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                    <th className="px-4 py-2">Student</th>
                    <th className="px-4 py-2">Marks (out of {editing.maxMarks || '—'})</th>
                    <th className="px-4 py-2">Absent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {editing.rows.map((r, i) => {
                    const set = (patch: Partial<Row>) => setEditing({ ...editing, rows: editing.rows.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
                    return (
                      <tr key={r.studentId}>
                        <td className="px-4 py-2"><p className="font-medium text-[#1A2B4A]">{r.name}</p><p className="font-mono text-xs text-gray-500">{r.reg}</p></td>
                        <td className="px-4 py-2">
                          <input type="number" min={0} max={Number(editing.maxMarks) || undefined} step="0.5" value={r.marks} disabled={r.absent} onChange={(e) => set({ marks: e.target.value })} aria-label={`Marks for ${r.name}`} className="w-24 rounded-lg border-2 border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100" />
                        </td>
                        <td className="px-4 py-2"><input type="checkbox" checked={r.absent} onChange={(e) => set({ absent: e.target.checked, marks: e.target.checked ? '' : r.marks })} aria-label={`${r.name} absent`} className="h-4 w-4 accent-red-500" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="button" onClick={save} isLoading={saving}>{editing.id ? 'Save marks' : 'Publish result'}</Button>
            </div>
          </div>
        </SectionCard>
      )}

      <SectionCard title={`Tests — ${sub || ''}${classNumber ? ` · Class ${classNumber}` : ''}`} bodyClassName="p-0">
        {loading && !data ? (
          <LoadingState label="Loading tests…" />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (data?.tests ?? []).length === 0 ? (
          <div className="p-6"><EmptyState icon={BarChart3} title="No tests yet" message="Create a test and enter marks to publish a result." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-5 py-3">Test</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Appeared</th>
                  <th className="px-5 py-3">Average</th>
                  <th className="px-5 py-3">Highest</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data!.tests.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F7FAFC]">
                    <td className="px-5 py-3"><p className="font-semibold text-[#1A2B4A]">{t.title}</p><Badge tone={t.testType === 'monthly' ? 'blue' : 'gray'}>{TYPE_LABEL[t.testType]}</Badge></td>
                    <td className="px-5 py-3">{formatDate(t.testDate)}</td>
                    <td className="px-5 py-3">{t.stats.appeared} / {t.marks.length}</td>
                    <td className="px-5 py-3">{t.stats.average ?? '—'} / {t.maxMarks}</td>
                    <td className="px-5 py-3">{t.stats.highest ?? '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <button type="button" onClick={() => openEdit(t)} className="rounded-lg p-1.5 text-[#1295D8] hover:bg-blue-50" title="Edit marks"><Pencil size={16} /></button>
                      <button type="button" onClick={() => remove(t)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Delete test"><Trash2 size={16} /></button>
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
