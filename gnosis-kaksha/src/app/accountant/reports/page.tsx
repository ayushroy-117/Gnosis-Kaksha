import { BarChart3, FileSpreadsheet, FileText } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { getAccountantData, formatINR } from '@/lib/institute-data';

export const metadata = { title: 'Reports - Gnosis Kaksha' };

export default function AccountantReportsPage() {
  const { roster, stats, currentPeriod } = getAccountantData();

  const activeCount = roster.filter((s) => s.status === 'active').length;
  const collected = stats.collectedThisMonth;
  const outstanding = stats.pendingDues;
  const billed = collected + outstanding;
  const collectionRate = billed > 0 ? Math.round((collected / billed) * 100) : 0;
  const paidCount = activeCount - stats.defaulterCount;

  return (
    <div className="space-y-6">
      <SampleDataBanner />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Reports</h1>
          <p className="mt-1 text-[#4A5568]">
            Collection summary for {currentPeriod}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-[#4A5568] opacity-60"
          >
            <FileSpreadsheet size={16} /> Export CSV
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-[#4A5568] opacity-60"
          >
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Tuition Billed</p>
          <p className="mt-1 text-2xl font-bold text-[#1A2B4A]">{formatINR(billed)}</p>
          <p className="mt-1 text-xs text-[#718096]">{activeCount} active students</p>
        </div>
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Collected</p>
          <p className="mt-1 text-2xl font-bold text-[#10B981]">{formatINR(collected)}</p>
          <p className="mt-1 text-xs text-[#718096]">{paidCount} paid</p>
        </div>
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Outstanding</p>
          <p className="mt-1 text-2xl font-bold text-[#F59E0B]">{formatINR(outstanding)}</p>
          <p className="mt-1 text-xs text-[#718096]">{stats.defaulterCount} pending</p>
        </div>
      </div>

      <SectionCard title="Collection Progress" description={`${collectionRate}% of billed tuition collected`}>
        <div className="space-y-4">
          <div className="h-4 w-full overflow-hidden rounded-full bg-[#EDF2F7]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1295D8] to-[#50B4F2]"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#1295D8]" />
              <span className="text-[#4A5568]">
                Collected — <span className="font-semibold text-[#1A2B4A]">{formatINR(collected)}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#EDF2F7] ring-1 ring-inset ring-gray-300" />
              <span className="text-[#4A5568]">
                Outstanding — <span className="font-semibold text-[#1A2B4A]">{formatINR(outstanding)}</span>
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-[#F7FAFC] px-4 py-3">
        <BarChart3 size={18} className="mt-0.5 shrink-0 text-[#718096]" />
        <p className="text-sm text-[#4A5568]">
          Detailed month-on-month revenue charts, class-wise breakdowns and downloadable
          statements are coming soon.
        </p>
      </div>
    </div>
  );
}
