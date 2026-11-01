'use client';

import { useMemo, useState } from 'react';
import { Banknote, Eye, Plus, Settings, Trash2, Users, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SalaryReceiptModal } from '@/components/salary/SalaryReceipt';
import { useApi, apiFetch } from '@/hooks/useApi';
import { formatINR, formatDate } from '@/lib/format';
import {
  DEFAULT_DEDUCTIONS,
  DEFAULT_EARNINGS,
  maskAccount,
  PAYMENT_MODES,
  periodLabel,
  type SalaryLine,
  type SalaryPayment,
} from '@/lib/salary';

interface StaffSalary {
  userId: string;
  fullName: string;
  role: string;
  staffCode: string;
  designation: string;
  employmentStatus: string;
  monthlySalary: number | null;
  bankHolder: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  bankAccountType: string | null;
  subjects: string | null;
}

interface SalaryData {
  payments: SalaryPayment[];
  staff: StaffSalary[];
}

const thisMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date());
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

function Lines({ title, lines, onChange, tone }: { title: string; lines: SalaryLine[]; onChange: (l: SalaryLine[]) => void; tone: 'green' | 'red' }) {
  const set = (i: number, patch: Partial<SalaryLine>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div>
      <p className={`mb-1.5 text-xs font-bold uppercase tracking-wide ${tone === 'green' ? 'text-emerald-700' : 'text-red-700'}`}>{title}</p>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={l.label}
              onChange={(e) => set(i, { label: e.target.value })}
              placeholder="Particular"
              aria-label={`${title} particular ${i + 1}`}
              className="min-w-0 flex-1 rounded-lg border-2 border-gray-300 px-2 py-1.5 text-sm focus:border-[#1295D8] focus:outline-none"
            />
            <input
              type="number"
              min={0}
              value={l.amount || ''}
              onChange={(e) => set(i, { amount: Number(e.target.value) })}
              placeholder="₹"
              aria-label={`${title} amount ${i + 1}`}
              className="w-28 rounded-lg border-2 border-gray-300 px-2 py-1.5 text-right text-sm focus:border-[#1295D8] focus:outline-none"
            />
            <button type="button" onClick={() => onChange(lines.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove line">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...lines, { label: '', amount: 0 }])} className="inline-flex items-center gap-1 text-xs font-semibold text-[#1295D8] hover:underline">
          <Plus size={13} /> Add line
        </button>
      </div>
    </div>
  );
}

export default function SalariesPage() {
  const { data, error, loading, reload } = useApi<SalaryData>('/api/salaries');
  const [month, setMonth] = useState(thisMonth());
  const [receipt, setReceipt] = useState<SalaryPayment | null>(null);
  const [editing, setEditing] = useState<{ staff: StaffSalary; existing?: SalaryPayment } | null>(null);
  const [settingsFor, setSettingsFor] = useState<StaffSalary | null>(null);
  const [saving, setSaving] = useState(false);

  // Record form
  const [period, setPeriod] = useState(thisMonth());
  const [earnings, setEarnings] = useState<SalaryLine[]>([]);
  const [deductions, setDeductions] = useState<SalaryLine[]>([]);
  const [status, setStatus] = useState<'pending' | 'paid'>('paid');
  const [payDate, setPayDate] = useState(today());
  const [mode, setMode] = useState<string>('Bank Transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  // Settings form
  const [settings, setSettings] = useState({ monthlySalary: '', bankHolder: '', bankName: '', bankAccount: '', bankIfsc: '', bankAccountType: 'Savings' });

  const monthPayments = useMemo(() => (data?.payments ?? []).filter((p) => p.period === month), [data, month]);
  const paidBy = useMemo(() => new Map(monthPayments.map((p) => [p.userId, p])), [monthPayments]);

  if (loading && !data) return <LoadingState label="Loading salaries…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load salaries.'} onRetry={reload} />;

  const activeStaff = data.staff.filter((s) => s.employmentStatus === 'active');
  const paidTotal = monthPayments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.net, 0);
  const pendingCount = activeStaff.filter((s) => paidBy.get(s.userId)?.status !== 'paid').length;

  const openRecord = (staff: StaffSalary, existing?: SalaryPayment) => {
    setEditing({ staff, existing });
    setPeriod(existing?.period ?? month);
    setEarnings(existing?.earnings.length ? existing.earnings : DEFAULT_EARNINGS.map((label, i) => ({ label, amount: i === 0 ? staff.monthlySalary ?? 0 : 0 })));
    setDeductions(existing?.deductions.length ? existing.deductions : DEFAULT_DEDUCTIONS.map((label) => ({ label, amount: 0 })));
    setStatus(existing?.status ?? 'paid');
    setPayDate(existing?.paymentDate ?? today());
    setMode(existing?.paymentMode ?? 'Bank Transfer');
    setReference(existing?.reference ?? '');
    setNote(existing?.note ?? '');
  };

  const openSettings = (s: StaffSalary) => {
    setSettingsFor(s);
    setSettings({
      monthlySalary: s.monthlySalary != null ? String(s.monthlySalary) : '',
      bankHolder: s.bankHolder ?? s.fullName,
      bankName: s.bankName ?? '',
      bankAccount: s.bankAccount ?? '',
      bankIfsc: s.bankIfsc ?? '',
      bankAccountType: s.bankAccountType ?? 'Savings',
    });
  };

  const gross = earnings.reduce((s, l) => s + (l.amount || 0), 0);
  const totalDeduction = deductions.reduce((s, l) => s + (l.amount || 0), 0);

  const saveRecord = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { payment } = await apiFetch<{ payment: SalaryPayment }>('/api/salaries', {
        method: 'POST',
        json: {
          userId: editing.staff.userId,
          period,
          earnings: earnings.filter((l) => l.label.trim()),
          deductions: deductions.filter((l) => l.label.trim()),
          status,
          paymentDate: status === 'paid' ? payDate : null,
          paymentMode: status === 'paid' ? mode : null,
          reference: reference || null,
          note: note || null,
        },
      });
      toast.success(`Salary for ${periodLabel(period)} saved`);
      setEditing(null);
      reload();
      if (payment.status === 'paid') setReceipt(payment);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the salary');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    if (!settingsFor) return;
    setSaving(true);
    try {
      await apiFetch('/api/salaries', {
        method: 'PATCH',
        json: { userId: settingsFor.userId, ...settings, monthlySalary: settings.monthlySalary === '' ? null : Number(settings.monthlySalary) },
      });
      toast.success('Salary settings saved');
      setSettingsFor(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: SalaryPayment) => {
    if (!confirm(`Delete salary record ${p.receiptNumber} for ${p.staffName}?`)) return;
    try {
      await apiFetch(`/api/salaries?id=${p.id}`, { method: 'DELETE' });
      toast.success('Salary record deleted');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Staff Salaries</h1>
          <p className="mt-1 text-[#4A5568]">Record monthly salaries with incentives and deductions; each record produces a salary receipt the teacher can download.</p>
        </div>
        <label className="text-sm font-semibold text-[#1A2B4A]">
          Month{' '}
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="ml-1 rounded-lg border-2 border-gray-300 px-2 py-1 text-sm" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Active staff" value={activeStaff.length} />
        <StatCard icon={Wallet} label={`Paid in ${periodLabel(month)}`} value={formatINR(paidTotal)} />
        <StatCard icon={Banknote} label="Still to pay" value={pendingCount} sublabel="active staff without a paid record" />
      </div>

      <SectionCard title={`Staff — ${periodLabel(month)}`} bodyClassName="p-0">
        {data.staff.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Users} title="No staff accounts yet" message="Teachers and accountants created by the admin appear here." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-5 py-3">Staff</th>
                  <th className="px-5 py-3">Monthly Salary</th>
                  <th className="px-5 py-3">Bank</th>
                  <th className="px-5 py-3">This Month</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.staff.map((s) => {
                  const p = paidBy.get(s.userId);
                  return (
                    <tr key={s.userId} className="hover:bg-[#F7FAFC]">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-[#1A2B4A]">{s.fullName}</p>
                        <p className="text-xs text-gray-500">{s.staffCode} · {s.designation}{s.employmentStatus !== 'active' ? ` · ${s.employmentStatus}` : ''}</p>
                      </td>
                      <td className="px-5 py-3 font-medium">{s.monthlySalary != null ? formatINR(s.monthlySalary) : <span className="text-gray-400">Not set</span>}</td>
                      <td className="px-5 py-3 text-xs text-gray-600">{s.bankName ? `${s.bankName} · ${maskAccount(s.bankAccount)}` : <span className="text-gray-400">Not set</span>}</td>
                      <td className="px-5 py-3">
                        {p ? <Badge tone={p.status === 'paid' ? 'green' : 'amber'}>{p.status === 'paid' ? `Paid ${formatINR(p.net)}` : 'Pending'}</Badge> : <Badge tone="gray">No record</Badge>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        {p && (
                          <button type="button" onClick={() => setReceipt(p)} className="rounded-lg p-1.5 text-[#1295D8] hover:bg-blue-50" title="View receipt">
                            <Eye size={16} />
                          </button>
                        )}
                        <button type="button" onClick={() => openSettings(s)} className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100" title="Monthly salary & bank details">
                          <Settings size={16} />
                        </button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => openRecord(s, p)} className="ml-1">
                          {p ? 'Edit' : 'Record salary'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Salary History" description="Every salary record, newest month first." bodyClassName="p-0">
        {data.payments.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Wallet} title="No salary records yet" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-5 py-3">Receipt</th>
                  <th className="px-5 py-3">Staff</th>
                  <th className="px-5 py-3">Month</th>
                  <th className="px-5 py-3">Net</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Paid On</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F7FAFC]">
                    <td className="px-5 py-3 font-mono text-xs">{p.receiptNumber}</td>
                    <td className="px-5 py-3 font-medium text-[#1A2B4A]">{p.staffName}</td>
                    <td className="px-5 py-3">{periodLabel(p.period)}</td>
                    <td className="px-5 py-3 font-semibold">{formatINR(p.net)}</td>
                    <td className="px-5 py-3"><Badge tone={p.status === 'paid' ? 'green' : 'amber'}>{p.status === 'paid' ? 'Paid' : 'Pending'}</Badge></td>
                    <td className="px-5 py-3 text-xs text-gray-600">{p.paymentDate ? `${formatDate(p.paymentDate)} · ${p.paymentMode}` : '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <button type="button" onClick={() => setReceipt(p)} className="rounded-lg p-1.5 text-[#1295D8] hover:bg-blue-50" title="View receipt">
                        <Eye size={16} />
                      </button>
                      <button type="button" onClick={() => remove(p)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Delete record">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={`Salary — ${editing?.staff.fullName ?? ''}`} size="xl">
        <div className="space-y-4">
          <Input label="Pay month" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          <Lines title="Earnings" lines={earnings} onChange={setEarnings} tone="green" />
          <Lines title="Deductions" lines={deductions} onChange={setDeductions} tone="red" />
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3 text-center text-sm">
            <div><p className="text-xs text-gray-500">Gross</p><p className="font-bold">{formatINR(gross)}</p></div>
            <div><p className="text-xs text-gray-500">Deductions</p><p className="font-bold text-red-600">{formatINR(totalDeduction)}</p></div>
            <div><p className="text-xs text-gray-500">Net</p><p className="font-black text-emerald-700">{formatINR(gross - totalDeduction)}</p></div>
          </div>
          <div className="flex gap-4 text-sm">
            {(['paid', 'pending'] as const).map((s) => (
              <label key={s} className="inline-flex items-center gap-1.5">
                <input type="radio" checked={status === s} onChange={() => setStatus(s)} className="accent-[#1295D8]" /> {s === 'paid' ? 'Paid' : 'Pending'}
              </label>
            ))}
          </div>
          {status === 'paid' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input label="Payment date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              <label className="block text-sm font-medium text-[#1A2B4A]">
                Payment mode
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-gray-300 px-2 py-2 text-sm">
                  {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
                </select>
              </label>
              <Input label="Transaction ID / ref" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          )}
          <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="button" onClick={saveRecord} isLoading={saving}>Save salary</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!settingsFor} onClose={() => setSettingsFor(null)} title={`Salary settings — ${settingsFor?.fullName ?? ''}`} size="lg">
        <div className="space-y-3">
          <Input label="Monthly salary (₹)" type="number" min={0} value={settings.monthlySalary} onChange={(e) => setSettings({ ...settings, monthlySalary: e.target.value })} />
          <Input label="Account holder name" value={settings.bankHolder} onChange={(e) => setSettings({ ...settings, bankHolder: e.target.value })} />
          <Input label="Bank name" value={settings.bankName} onChange={(e) => setSettings({ ...settings, bankName: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Account number" inputMode="numeric" value={settings.bankAccount} onChange={(e) => setSettings({ ...settings, bankAccount: e.target.value.replace(/\D/g, '') })} />
            <Input label="IFSC" value={settings.bankIfsc} onChange={(e) => setSettings({ ...settings, bankIfsc: e.target.value.toUpperCase() })} />
          </div>
          <Input label="Account type" value={settings.bankAccountType} onChange={(e) => setSettings({ ...settings, bankAccountType: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSettingsFor(null)}>Cancel</Button>
            <Button type="button" onClick={saveSettings} isLoading={saving}>Save</Button>
          </div>
        </div>
      </Modal>

      {receipt && <SalaryReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
