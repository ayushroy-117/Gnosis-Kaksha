import { Wallet, Download, CheckCircle2, Clock } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { getStudentData, formatINR, formatDate } from '@/lib/student-data';

export const metadata = { title: 'Fees - Gnosis Kaksha' };

export default function StudentFeesPage() {
  const { feeStatus, subjects } = getStudentData();

  const breakdown = [
    ...subjects.map((s) => ({
      label: `${s.name} (tuition)`,
      value: s.monthlyFee,
      tone: 'default' as const,
    })),
    { label: 'Monthly Tuition (subtotal)', value: feeStatus.monthlyTuition, tone: 'subtotal' as const },
    {
      label: `Scholarship discount (${feeStatus.scholarshipPercent}%)`,
      value: -feeStatus.scholarshipAmount,
      tone: 'discount' as const,
    },
    { label: 'Tuition after scholarship', value: feeStatus.tuitionAfterScholarship, tone: 'subtotal' as const },
    { label: 'Examination fee', value: feeStatus.examFee, tone: 'default' as const },
    { label: 'T-shirt fee', value: feeStatus.tshirtFee, tone: 'default' as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Fees</h1>
        <p className="mt-1 text-[#4A5568]">Your fee breakdown and payment history.</p>
      </div>

      {/* Amount payable banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#CDE6F7] text-[#1295D8]">
            <Wallet size={26} />
          </div>
          <div>
            <p className="text-sm text-[#718096]">Amount payable</p>
            <p className="text-3xl font-bold text-[#1A2B4A]">
              {formatINR(feeStatus.finalPayable)}
            </p>
            <p className="mt-0.5 text-sm text-[#718096]">
              Due by {formatDate(feeStatus.nextDueDate)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Badge tone={feeStatus.status === 'paid' ? 'green' : 'amber'}>
            {feeStatus.status === 'paid' ? 'Paid' : 'Payment due'}
          </Badge>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#1295D8] to-[#50B4F2] px-5 py-2.5 text-sm font-semibold text-white transition hover:shadow-lg"
          >
            Pay Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Breakdown */}
        <SectionCard title="Fee Breakdown" className="lg:col-span-2" bodyClassName="p-0">
          <dl className="divide-y divide-gray-100">
            {breakdown.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-3 px-6 py-3 text-sm"
              >
                <dt
                  className={
                    row.tone === 'subtotal'
                      ? 'font-semibold text-[#1A2B4A]'
                      : 'text-[#4A5568]'
                  }
                >
                  {row.label}
                </dt>
                <dd
                  className={
                    row.tone === 'discount'
                      ? 'font-semibold text-[#10B981]'
                      : row.tone === 'subtotal'
                        ? 'font-semibold text-[#1A2B4A]'
                        : 'font-medium text-[#1A2B4A]'
                  }
                >
                  {row.value < 0 ? `−${formatINR(-row.value)}` : formatINR(row.value)}
                </dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 bg-[#F7FAFC] px-6 py-4">
              <dt className="text-base font-bold text-[#1A2B4A]">Total Payable</dt>
              <dd className="text-lg font-bold text-[#1295D8]">
                {formatINR(feeStatus.finalPayable)}
              </dd>
            </div>
          </dl>
        </SectionCard>

        {/* Payment history */}
        <SectionCard
          title="Payment History"
          description="Receipts for cleared payments"
          className="lg:col-span-3"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-gray-100">
            {feeStatus.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-6 py-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    p.status === 'paid'
                      ? 'bg-green-100 text-green-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {p.status === 'paid' ? <CheckCircle2 size={20} /> : <Clock size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1A2B4A]">
                    {p.description}
                  </p>
                  <p className="text-xs text-[#718096]">
                    {formatDate(p.date)} · {p.method} · {p.id}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#1A2B4A]">
                    {formatINR(p.amount)}
                  </span>
                  <button
                    type="button"
                    title="Download receipt"
                    aria-label="Download receipt"
                    className="rounded-md p-1.5 text-[#718096] transition hover:bg-gray-100 hover:text-[#1295D8]"
                  >
                    <Download size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
