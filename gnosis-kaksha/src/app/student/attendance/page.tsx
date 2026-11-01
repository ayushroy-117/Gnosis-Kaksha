'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CalendarCheck, CalendarX, Percent, BookOpen } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { useApi } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';

interface AttendanceData {
  overall: { total: number; attended: number; missed: number; percent: number | null };
  subjects: Array<{ subject: string; total: number; present: number; late: number; absent: number; percent: number | null }>;
  classes: Array<{ date: string; subject: string; teacher: string; status: 'present' | 'absent' | 'late'; remark: string | null }>;
  requiredPercent: number;
}

const STATUS = {
  present: { tone: 'green' as const, label: 'Present' },
  late: { tone: 'amber' as const, label: 'Late' },
  absent: { tone: 'red' as const, label: 'Absent' },
};

export default function StudentAttendancePage() {
  const as = useSearchParams().get('as');
  const { data, error, loading, reload } = useApi<AttendanceData>(`/api/student/attendance${as ? `?as=${encodeURIComponent(as)}` : ''}`);
  const [filter, setFilter] = useState<'missed' | 'all'>('missed');

  if (loading && !data) return <LoadingState label="Loading attendance…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load attendance.'} onRetry={reload} />;

  const { overall, subjects, classes, requiredPercent } = data;
  const shown = filter === 'missed' ? classes.filter((c) => c.status === 'absent') : classes;
  const low = overall.percent !== null && overall.percent < requiredPercent;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Attendance Tracker</h1>
        <p className="mt-1 text-[#4A5568]">Your attendance from every class register, and the classes you missed. At least {requiredPercent}% is required in each subject.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Percent} label="Overall attendance" value={overall.percent === null ? '—' : `${overall.percent}%`} valueColor={low ? 'text-red-600' : undefined} sublabel={low ? `Below the required ${requiredPercent}%` : undefined} />
        <StatCard icon={CalendarCheck} label="Classes attended" value={`${overall.attended} / ${overall.total}`} />
        <StatCard icon={CalendarX} label="Classes missed" value={overall.missed} />
      </div>

      <SectionCard title="Subject-wise attendance" bodyClassName="p-0">
        {subjects.length === 0 ? (
          <div className="p-6"><EmptyState icon={BookOpen} title="No attendance recorded yet" message="It appears here once your teachers mark the class register." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Classes</th>
                  <th className="px-5 py-3">Present</th>
                  <th className="px-5 py-3">Late</th>
                  <th className="px-5 py-3">Absent</th>
                  <th className="px-5 py-3">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjects.map((s) => (
                  <tr key={s.subject}>
                    <td className="px-5 py-3 font-semibold text-[#1A2B4A]">{s.subject}</td>
                    <td className="px-5 py-3">{s.total}</td>
                    <td className="px-5 py-3 text-emerald-700">{s.present}</td>
                    <td className="px-5 py-3 text-amber-700">{s.late}</td>
                    <td className="px-5 py-3 text-red-600">{s.absent}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div className={`h-full ${(s.percent ?? 0) < requiredPercent ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${s.percent ?? 0}%` }} />
                        </div>
                        <span className={`font-semibold ${(s.percent ?? 0) < requiredPercent ? 'text-red-600' : 'text-emerald-700'}`}>{s.percent ?? 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={filter === 'missed' ? 'Classes you missed' : 'All classes'}
        action={
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-semibold">
            {(['missed', 'all'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={`rounded-md px-3 py-1 ${filter === f ? 'bg-white text-[#1295D8] shadow-xs' : 'text-gray-600'}`}>
                {f === 'missed' ? 'Missed' : 'All'}
              </button>
            ))}
          </div>
        }
        bodyClassName="p-0"
      >
        {shown.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">{filter === 'missed' ? 'No missed classes. Keep it up!' : 'No classes recorded yet.'}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {shown.map((c, i) => (
              <li key={`${c.date}-${c.subject}-${i}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-[#1A2B4A]">{c.subject} <span className="font-normal text-gray-500">· {c.teacher}</span></p>
                  <p className="text-xs text-gray-500">{formatDate(c.date)}{c.remark ? ` · ${c.remark}` : ''}</p>
                </div>
                <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
