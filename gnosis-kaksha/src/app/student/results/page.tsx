'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Award, BarChart3, FileDown, Printer, Target, TrendingUp } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { SignatureImg, DIRECTOR_SIGNATURE_SRC } from '@/components/id-card/parts';
import { useApi } from '@/hooks/useApi';
import { useStudentPortal } from '@/hooks/useStudentPortal';
import { formatDate } from '@/lib/format';
import { INSTITUTE_ADDRESS_FULL, INSTITUTE_NAME, INSTITUTE_TAGLINE } from '@/lib/institute-contact';

interface Result {
  id: string;
  subject: string;
  testType: 'weekly' | 'monthly' | 'other';
  title: string;
  testDate: string;
  teacher: string;
  maxMarks: number;
  marks: number | null;
  absent: boolean;
  percent: number | null;
  rank: number | null;
  appeared: number;
  classAverage: number | null;
  highest: number | null;
}
interface ResultsData {
  tests: Result[];
  subjects: Array<{ subject: string; tests: number; average: number; best: number }>;
  summary: { testsTaken: number; absences: number; average: number | null; bestSubject: string | null; weakestSubject: string | null };
}
interface AttendanceSummary {
  overall: { total: number; attended: number; percent: number | null };
}

function grade(p: number | null) {
  if (p == null) return '—';
  return p >= 90 ? 'A+' : p >= 80 ? 'A' : p >= 70 ? 'B+' : p >= 60 ? 'B' : p >= 50 ? 'C' : p >= 40 ? 'D' : 'E';
}

function remark(avg: number | null, best: string | null, weakest: string | null) {
  if (avg == null) return 'No test results recorded yet.';
  const lead = avg >= 85 ? 'Outstanding performance. Keep up the excellent work.'
    : avg >= 70 ? 'Very good performance with consistent effort.'
    : avg >= 55 ? 'Good progress; regular revision will lift the scores further.'
    : avg >= 40 ? 'Needs steady improvement; attend doubt sessions and practise regularly.'
    : 'Needs serious attention; please meet the subject teachers.';
  return [lead, best ? `Strongest in ${best}.` : '', weakest ? `Focus more on ${weakest}.` : ''].filter(Boolean).join(' ');
}

const TYPE = { weekly: 'Weekly', monthly: 'Monthly', other: 'Test' };

export default function StudentResultsPage() {
  const { data: portal, viewingAs } = useStudentPortal();
  const q = viewingAs ? `?as=${encodeURIComponent(viewingAs)}` : '';
  const { data, error, loading, reload } = useApi<ResultsData>(`/api/student/results${q}`);
  const { data: att } = useApi<AttendanceSummary>(`/api/student/attendance${q}`);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [report, setReport] = useState(false);

  if (loading && !data) return <LoadingState label="Loading results…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load results.'} onRetry={reload} />;

  const { tests, subjects, summary } = data;
  const shown = subjectFilter === 'all' ? tests : tests.filter((t) => t.subject === subjectFilter);
  const profile = portal?.profile;

  if (report) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2 print:hidden">
          <Button type="button" variant="outline" onClick={() => setReport(false)}>Back</Button>
          <Button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5"><Printer size={15} /> Print / Save PDF</Button>
        </div>
        <div className="receipt-single-page mx-auto max-w-[780px] border-2 border-[#0F172A] bg-white text-xs text-black">
          <div className="flex items-center gap-3 bg-[#0F172A] px-5 py-3 text-white">
            <Image src="/logo-white.png" alt="" width={52} height={52} className="h-13 w-13 object-contain" />
            <div className="flex-1">
              <p className="text-xl font-black tracking-wide">{INSTITUTE_NAME}</p>
              <p className="text-[9px] uppercase tracking-[0.3em] text-amber-300">{INSTITUTE_TAGLINE}</p>
              <p className="text-[9px] text-slate-300">{INSTITUTE_ADDRESS_FULL}</p>
            </div>
            <p className="text-right text-sm font-black uppercase tracking-wider text-amber-400">Progress<br />Report</p>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg border border-gray-300 p-3 text-[11px]">
              <p><span className="text-gray-500">Student:</span> <strong>{profile?.fullName}</strong></p>
              <p><span className="text-gray-500">Reg. No.:</span> <strong className="font-mono">{profile?.registrationNumber}</strong></p>
              <p><span className="text-gray-500">Class:</span> <strong>{profile?.classNumber}{profile?.stream ? ` · ${profile.stream}` : ''} · {profile?.board}</strong></p>
              <p><span className="text-gray-500">Branch:</span> <strong>{profile?.branchName}</strong></p>
              <p><span className="text-gray-500">Report date:</span> <strong>{formatDate(new Date().toISOString().slice(0, 10))}</strong></p>
              <p><span className="text-gray-500">Attendance:</span> <strong>{att?.overall.percent != null ? `${att.overall.percent}% (${att.overall.attended}/${att.overall.total} classes)` : 'Not recorded'}</strong></p>
            </div>

            <table className="w-full border-collapse border border-gray-400 text-[11px]">
              <thead>
                <tr className="bg-gray-100 text-left">
                  {['Subject', 'Tests', 'Average %', 'Best %', 'Grade'].map((h) => <th key={h} className="border border-gray-300 p-1.5">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr key={s.subject}>
                    <td className="border border-gray-300 p-1.5 font-semibold">{s.subject}</td>
                    <td className="border border-gray-300 p-1.5">{s.tests}</td>
                    <td className="border border-gray-300 p-1.5">{s.average}%</td>
                    <td className="border border-gray-300 p-1.5">{s.best}%</td>
                    <td className="border border-gray-300 p-1.5 font-bold">{grade(s.average)}</td>
                  </tr>
                ))}
                <tr className="bg-emerald-50 font-black">
                  <td className="border border-gray-300 p-1.5">Overall</td>
                  <td className="border border-gray-300 p-1.5">{summary.testsTaken}</td>
                  <td className="border border-gray-300 p-1.5">{summary.average ?? '—'}%</td>
                  <td className="border border-gray-300 p-1.5" />
                  <td className="border border-gray-300 p-1.5">{grade(summary.average)}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full border-collapse border border-gray-400 text-[10px]">
              <thead>
                <tr className="bg-gray-100 text-left">
                  {['Date', 'Test', 'Subject', 'Marks', '%', 'Rank', 'Class avg'].map((h) => <th key={h} className="border border-gray-300 p-1">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => (
                  <tr key={t.id}>
                    <td className="border border-gray-300 p-1">{formatDate(t.testDate)}</td>
                    <td className="border border-gray-300 p-1">{t.title} ({TYPE[t.testType]})</td>
                    <td className="border border-gray-300 p-1">{t.subject}</td>
                    <td className="border border-gray-300 p-1">{t.absent ? 'Absent' : `${t.marks} / ${t.maxMarks}`}</td>
                    <td className="border border-gray-300 p-1">{t.percent ?? '—'}</td>
                    <td className="border border-gray-300 p-1">{t.rank ? `${t.rank} / ${t.appeared}` : '—'}</td>
                    <td className="border border-gray-300 p-1">{t.classAverage ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="rounded-lg border border-gray-300 p-3">
              <p className="mb-1 text-[11px] font-black uppercase tracking-wider">Remarks</p>
              <p className="text-[11px] italic">{remark(summary.average, summary.bestSubject, summary.weakestSubject)}</p>
            </div>

            <div className="grid grid-cols-2 items-end gap-8 pt-4 text-center text-[10px]">
              <div><span className="block h-9" /><p className="border-t border-gray-400 pt-1 font-bold uppercase">Parent / Guardian</p></div>
              <div className="flex flex-col items-center">
                <SignatureImg src={DIRECTOR_SIGNATURE_SRC} alt="Director's signature" className="h-9 max-w-[130px]" />
                <p className="w-full border-t border-gray-400 pt-1 font-bold uppercase">Director, {INSTITUTE_NAME}</p>
              </div>
            </div>
            <p className="text-center text-[9px] text-gray-400">Generated automatically from the marks uploaded by subject teachers. Grades: A+ ≥90, A ≥80, B+ ≥70, B ≥60, C ≥50, D ≥40.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Results &amp; Performance</h1>
          <p className="mt-1 text-[#4A5568]">Weekly and monthly test marks with your rank, percentage and subject-wise performance.</p>
        </div>
        <Button type="button" onClick={() => setReport(true)} disabled={!tests.length} className="inline-flex items-center gap-1.5 self-start">
          <FileDown size={16} /> Download progress report
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BarChart3} label="Tests taken" value={summary.testsTaken} sublabel={summary.absences ? `${summary.absences} absent` : undefined} />
        <StatCard icon={TrendingUp} label="Average score" value={summary.average != null ? `${summary.average}%` : '—'} sublabel={`Grade ${grade(summary.average)}`} />
        <StatCard icon={Award} label="Best subject" value={summary.bestSubject ?? '—'} />
        <StatCard icon={Target} label="Needs focus" value={summary.weakestSubject ?? '—'} />
      </div>

      <SectionCard title="Subject-wise performance">
        {subjects.length === 0 ? (
          <EmptyState icon={BarChart3} title="No results yet" message="Your marks appear here as soon as your teachers upload them." />
        ) : (
          <div className="space-y-3">
            {subjects.map((s) => (
              <div key={s.subject}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-semibold text-[#1A2B4A]">{s.subject}</span><span className="text-gray-600">{s.average}% avg · Grade {grade(s.average)}</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${s.average >= 60 ? 'bg-emerald-500' : s.average >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.average}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="All tests"
        action={
          <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="rounded-lg border-2 border-gray-300 px-2 py-1 text-sm" aria-label="Subject">
            <option value="all">All subjects</option>
            {subjects.map((s) => <option key={s.subject}>{s.subject}</option>)}
          </select>
        }
        bodyClassName="p-0"
      >
        {shown.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No tests recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-5 py-3">Test</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Marks</th>
                  <th className="px-5 py-3">%</th>
                  <th className="px-5 py-3">Rank</th>
                  <th className="px-5 py-3">Class avg / Highest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((t) => (
                  <tr key={t.id}>
                    <td className="px-5 py-3"><p className="font-semibold text-[#1A2B4A]">{t.title}</p><p className="text-xs text-gray-500">{t.subject} · {TYPE[t.testType]} · {t.teacher}</p></td>
                    <td className="px-5 py-3">{formatDate(t.testDate)}</td>
                    <td className="px-5 py-3 font-semibold">{t.absent ? <Badge tone="red">Absent</Badge> : `${t.marks} / ${t.maxMarks}`}</td>
                    <td className="px-5 py-3">{t.percent != null ? `${t.percent}%` : '—'}</td>
                    <td className="px-5 py-3">{t.rank ? <Badge tone={t.rank <= 3 ? 'green' : 'blue'}>{t.rank} of {t.appeared}</Badge> : '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{t.classAverage ?? '—'} / {t.highest ?? '—'}</td>
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
