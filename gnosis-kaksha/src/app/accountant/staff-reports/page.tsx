'use client';

import { useState } from 'react';
import { Activity, Download, Printer, Users } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { useApi } from '@/hooks/useApi';
import { formatDate, formatINR } from '@/lib/format';

interface StaffRow {
  userId: string;
  name: string;
  role: string;
  staffCode: string;
  department: string | null;
  branch: string | null;
  status: string;
  daysPresent: number;
  missedCheckouts: number;
  leaveDays: number;
  pendingLeaves: number;
  registersMarked: number;
  materialsUploaded: number;
  testsUploaded: number;
  solutionsPosted: number;
  noticesIssued: number;
  openDoubts: number;
  salaryPaid: number;
  lastActivity: string | null;
}
interface Report {
  from: string;
  to: string;
  staff: StaffRow[];
  activity: Array<{ userId: string; name: string; role: string; action: string; detail: string | null; at: string }>;
}

const COLUMNS: Array<[keyof StaffRow, string]> = [
  ['daysPresent', 'Days present'],
  ['leaveDays', 'Leave days'],
  ['pendingLeaves', 'Leave pending'],
  ['registersMarked', 'Class registers'],
  ['materialsUploaded', 'Materials'],
  ['testsUploaded', 'Tests uploaded'],
  ['solutionsPosted', 'Doubts solved'],
  ['openDoubts', 'Doubts waiting'],
  ['noticesIssued', 'Notices'],
];

const firstOfMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date()) + '-01';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const stamp = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function StaffReportsPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(today());
  const [who, setWho] = useState('');
  const { data, error, loading, reload } = useApi<Report>(`/api/reports/staff?from=${from}&to=${to}${who ? `&userId=${who}` : ''}`);
  const { data: everyone } = useApi<Report>(`/api/reports/staff?from=${from}&to=${to}`);

  const downloadCsv = () => {
    if (!data) return;
    const header = ['Name', 'Staff ID', 'Role', 'Branch', 'Status', ...COLUMNS.map(([, l]) => l), 'Missed check-outs', 'Salary paid', 'Last activity'];
    const lines = data.staff.map((r) => [r.name, r.staffCode, r.role, r.branch ?? '', r.status, ...COLUMNS.map(([k]) => r[k]), r.missedCheckouts, r.salaryPaid, r.lastActivity ? stamp(r.lastActivity) : '']);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `staff-report-${from}-to-${to}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Staff Reports</h1>
          <p className="mt-1 text-[#4A5568]">Everything teachers and accountants did in the portal for a period: attendance, leave, classes, results, doubts, notices and salary.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-gray-500">From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="ml-1 rounded-lg border-2 border-gray-300 px-2 py-1 text-sm" /></label>
          <label className="text-xs font-semibold text-gray-500">To<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="ml-1 rounded-lg border-2 border-gray-300 px-2 py-1 text-sm" /></label>
          <select value={who} onChange={(e) => setWho(e.target.value)} className="rounded-lg border-2 border-gray-300 px-2 py-1.5 text-sm" aria-label="Staff member">
            <option value="">All staff</option>
            {(everyone?.staff ?? []).map((s) => <option key={s.userId} value={s.userId}>{s.name}</option>)}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={downloadCsv} disabled={!data} className="inline-flex items-center gap-1"><Download size={14} /> CSV</Button>
          <Button type="button" size="sm" onClick={() => window.print()} disabled={!data} className="inline-flex items-center gap-1"><Printer size={14} /> Print</Button>
        </div>
      </div>

      {loading && !data ? (
        <LoadingState label="Building report…" />
      ) : error || !data ? (
        <ErrorState message={error?.message ?? 'Could not build the report.'} onRetry={reload} />
      ) : (
        <>
          <p className="hidden text-sm font-semibold print:block">Gnosis Kaksha — Staff report, {formatDate(data.from)} to {formatDate(data.to)}</p>
          <SectionCard title={`Summary — ${formatDate(data.from)} to ${formatDate(data.to)}`} bodyClassName="p-0">
            {data.staff.length === 0 ? (
              <div className="p-6"><EmptyState icon={Users} title="No staff accounts" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                      <th className="px-4 py-3">Staff</th>
                      {COLUMNS.map(([k, l]) => <th key={k} className="px-3 py-3 text-center">{l}</th>)}
                      <th className="px-3 py-3 text-right">Salary paid</th>
                      <th className="px-4 py-3">Last activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.staff.map((r) => (
                      <tr key={r.userId} className="hover:bg-[#F7FAFC]">
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => setWho(r.userId)} className="text-left font-semibold text-[#1A2B4A] hover:text-[#1295D8] print:pointer-events-none">{r.name}</button>
                          <p className="text-xs text-gray-500">{r.staffCode} · {r.role}{r.branch ? ` · ${r.branch}` : ''}</p>
                          {r.status !== 'active' && <Badge tone="red">{r.status}</Badge>}
                        </td>
                        {COLUMNS.map(([k]) => (
                          <td key={k} className={`px-3 py-3 text-center ${k === 'openDoubts' && r.openDoubts > 0 ? 'font-bold text-amber-700' : ''}`}>{r[k] as number}</td>
                        ))}
                        <td className="px-3 py-3 text-right font-medium">{r.salaryPaid ? formatINR(r.salaryPaid) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{r.lastActivity ? stamp(r.lastActivity) : '—'}{r.missedCheckouts > 0 && <p className="text-amber-700">{r.missedCheckouts} missed check-out(s)</p>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title={`Activity log${who ? ` — ${data.staff[0]?.name ?? ''}` : ''}`} description="Every action recorded in the period (latest 500)." bodyClassName="p-0">
            {data.activity.length === 0 ? (
              <div className="p-6"><EmptyState icon={Activity} title="No activity in this period" /></div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.activity.map((a, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 px-5 py-2.5 text-sm">
                    <div>
                      <p><span className="font-semibold text-[#1A2B4A]">{a.name}</span> <span className="text-gray-500">({a.role})</span> — {a.action}</p>
                      {a.detail && <p className="text-xs text-gray-500">{a.detail}</p>}
                    </div>
                    <span className="shrink-0 text-xs text-gray-500">{stamp(a.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
