'use client';

import { useState } from 'react';
import { Banknote, CalendarCheck, CreditCard, Download, Eye, Landmark, Pencil, Printer, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/dashboard/Badge';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SalaryReceiptModal } from '@/components/salary/SalaryReceipt';
import { numberToWordsINR } from '@/components/dashboard/OfficialFeeReceiptModal';
import { useApi, apiFetch } from '@/hooks/useApi';
import { formatDate, formatINR } from '@/lib/format';
import { maskAccount, periodLabel, type SalaryPayment } from '@/lib/salary';
import type { StaffProfile } from '@/lib/server/staff';

export function SalaryTab({ p, onSaved }: { p: StaffProfile; onSaved: (p: StaffProfile) => void }) {
  const { data, error, loading, reload } = useApi<{ payments: SalaryPayment[] }>('/api/salaries');
  const [receipt, setReceipt] = useState<SalaryPayment | null>(null);
  const [slipMonth, setSlipMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [printHistory, setPrintHistory] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [bank, setBank] = useState({ bankHolder: '', bankName: '', bankAccount: '', bankIfsc: '', bankAccountType: '' });
  const [saving, setSaving] = useState(false);

  if (loading && !data) return <LoadingState label="Loading salary…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load salary.'} onRetry={reload} />;

  const payments = data.payments;
  const latest = payments[0];
  const paid = payments.filter((x) => x.status === 'paid');
  const years = [...new Set(payments.map((x) => x.period.slice(0, 4)))];
  const yearPayments = payments.filter((x) => x.period.startsWith(year));

  const openBank = () => {
    setBank({
      bankHolder: p.bankHolder ?? p.fullName,
      bankName: p.bankName ?? '',
      bankAccount: p.bankAccount ?? '',
      bankIfsc: p.bankIfsc ?? '',
      bankAccountType: p.bankAccountType ?? 'Savings',
    });
    setBankOpen(true);
  };
  const saveBank = async () => {
    setSaving(true);
    try {
      const { profile } = await apiFetch<{ profile: StaffProfile }>('/api/staff/me', { method: 'PATCH', json: bank });
      onSaved(profile);
      toast.success('Bank details saved');
      setBankOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (printHistory) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end gap-2 print:hidden">
          <Button type="button" variant="outline" onClick={() => setPrintHistory(false)}>Back</Button>
          <Button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5"><Printer size={15} /> Print / Save PDF</Button>
        </div>
        <div className="receipt-single-page mx-auto max-w-[780px] border-2 border-black bg-white p-6 text-xs text-black">
          <h1 className="text-xl font-black">GNOSIS KAKSHA — Salary Payment History ({year})</h1>
          <p className="mb-4 text-gray-600">{p.fullName} · {p.staffCode} · {p.designation}</p>
          <table className="w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100 text-left">
                {['Month', 'Receipt', 'Gross', 'Deductions', 'Net', 'Status', 'Paid On', 'Mode / Ref'].map((h) => <th key={h} className="border border-gray-300 p-1.5">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {yearPayments.map((x) => (
                <tr key={x.id}>
                  <td className="border border-gray-300 p-1.5">{periodLabel(x.period)}</td>
                  <td className="border border-gray-300 p-1.5 font-mono">{x.receiptNumber}</td>
                  <td className="border border-gray-300 p-1.5">{formatINR(x.gross)}</td>
                  <td className="border border-gray-300 p-1.5">{formatINR(x.totalDeduction)}</td>
                  <td className="border border-gray-300 p-1.5 font-bold">{formatINR(x.net)}</td>
                  <td className="border border-gray-300 p-1.5">{x.status === 'paid' ? 'Paid' : 'Pending'}</td>
                  <td className="border border-gray-300 p-1.5">{x.paymentDate ? formatDate(x.paymentDate) : '—'}</td>
                  <td className="border border-gray-300 p-1.5">{[x.paymentMode, x.reference].filter(Boolean).join(' · ') || '—'}</td>
                </tr>
              ))}
              <tr className="font-black">
                <td className="border border-gray-300 p-1.5" colSpan={4}>Total paid in {year}</td>
                <td className="border border-gray-300 p-1.5" colSpan={4}>{formatINR(yearPayments.filter((x) => x.status === 'paid').reduce((s, x) => s + x.net, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Monthly Salary"
          value={p.monthlySalary != null ? formatINR(p.monthlySalary) : '—'}
          sublabel={p.monthlySalary != null ? numberToWordsINR(p.monthlySalary) : 'Set by the accountant'}
        />
        <StatCard icon={CalendarCheck} label="Latest Month" value={latest ? periodLabel(latest.period) : '—'} sublabel={latest ? (latest.status === 'paid' ? 'Paid' : 'Pending') : 'No salary records yet'} />
        <StatCard icon={Banknote} label="Payment Date" value={latest?.paymentDate ? formatDate(latest.paymentDate) : '—'} />
        <StatCard icon={CreditCard} label="Payment Mode" value={latest?.paymentMode ?? '—'} sublabel={latest?.reference ? `Ref: ${latest.reference}` : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <SectionCard title="Salary History" bodyClassName="p-0">
          {payments.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No salary has been recorded for you yet. The accountant enters it each month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Net Salary</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payment Date</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3 text-right">Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((x) => (
                    <tr key={x.id}>
                      <td className="px-4 py-2.5 font-medium">{periodLabel(x.period)}</td>
                      <td className="px-4 py-2.5">{formatINR(x.net)}</td>
                      <td className="px-4 py-2.5"><Badge tone={x.status === 'paid' ? 'green' : 'amber'}>{x.status === 'paid' ? 'Paid' : 'Pending'}</Badge></td>
                      <td className="px-4 py-2.5 text-xs">{x.paymentDate ? formatDate(x.paymentDate) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs">{x.paymentMode ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{x.reference ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button type="button" onClick={() => setReceipt(x)} className="rounded-lg p-1.5 text-[#1295D8] hover:bg-blue-50" title="View salary receipt">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="space-y-6">
          {latest && (
            <SectionCard title={`Breakdown — ${periodLabel(latest.period)}`}>
              <dl className="space-y-1.5 text-sm">
                {latest.earnings.map((l) => (
                  <div key={l.label} className="flex justify-between"><dt className="text-[#718096]">{l.label}</dt><dd>{formatINR(l.amount)}</dd></div>
                ))}
                {latest.deductions.map((l) => (
                  <div key={l.label} className="flex justify-between text-red-600"><dt>{l.label}</dt><dd>− {formatINR(l.amount)}</dd></div>
                ))}
                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-[#1295D8]"><dt>Net Salary</dt><dd>{formatINR(latest.net)}</dd></div>
              </dl>
            </SectionCard>
          )}
          <SectionCard
            title="Bank Account Details"
            action={<Button type="button" size="sm" variant="secondary" onClick={openBank} className="inline-flex items-center gap-1 text-xs"><Pencil size={13} /> Edit</Button>}
          >
            <dl className="space-y-1.5 text-sm">
              {[
                ['Account Holder', p.bankHolder],
                ['Bank Name', p.bankName],
                ['Account Number', maskAccount(p.bankAccount)],
                ['IFSC Code', p.bankIfsc],
                ['Account Type', p.bankAccountType],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-[#718096]">{k}</dt><dd className="font-medium">{v || <span className="text-gray-400">Not added</span>}</dd></div>
              ))}
            </dl>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SectionCard title="Download Salary Slip" description="Open the receipt for a month, then print or save it as PDF.">
          <div className="flex gap-2">
            <select value={slipMonth} onChange={(e) => setSlipMonth(e.target.value)} className="flex-1 rounded-lg border-2 border-gray-300 px-2 py-2 text-sm" aria-label="Salary month">
              <option value="">Choose month</option>
              {paid.map((x) => <option key={x.id} value={x.id}>{periodLabel(x.period)}</option>)}
            </select>
            <Button type="button" disabled={!slipMonth} onClick={() => setReceipt(payments.find((x) => x.id === slipMonth) ?? null)} className="inline-flex items-center gap-1.5">
              <Download size={15} /> Open
            </Button>
          </div>
        </SectionCard>
        <SectionCard title="Payment History Report" description="A year's salary payments on one page.">
          <div className="flex gap-2">
            <select value={year} onChange={(e) => setYear(e.target.value)} className="flex-1 rounded-lg border-2 border-gray-300 px-2 py-2 text-sm" aria-label="Year">
              {[...new Set([String(new Date().getFullYear()), ...years])].map((y) => <option key={y} value={y}>{y} (Jan – Dec)</option>)}
            </select>
            <Button type="button" variant="outline" onClick={() => setPrintHistory(true)} className="inline-flex items-center gap-1.5">
              <Landmark size={15} /> View report
            </Button>
          </div>
        </SectionCard>
      </div>

      <Modal isOpen={bankOpen} onClose={() => setBankOpen(false)} title="Bank account details" size="lg">
        <div className="space-y-3">
          <Input label="Account holder name" value={bank.bankHolder} onChange={(e) => setBank({ ...bank, bankHolder: e.target.value })} />
          <Input label="Bank name" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Account number" inputMode="numeric" value={bank.bankAccount} onChange={(e) => setBank({ ...bank, bankAccount: e.target.value.replace(/\D/g, '') })} />
            <Input label="IFSC" value={bank.bankIfsc} onChange={(e) => setBank({ ...bank, bankIfsc: e.target.value.toUpperCase() })} />
          </div>
          <Input label="Account type" value={bank.bankAccountType} onChange={(e) => setBank({ ...bank, bankAccountType: e.target.value })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setBankOpen(false)}>Cancel</Button>
            <Button type="button" onClick={saveBank} isLoading={saving}>Save</Button>
          </div>
        </div>
      </Modal>

      {receipt && <SalaryReceiptModal payment={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
