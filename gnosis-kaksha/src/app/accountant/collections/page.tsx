import { Wallet, IndianRupee } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import {
  getAccountantData,
  classLabel,
  formatINR,
} from '@/lib/institute-data';

export const metadata = { title: 'Collections - Gnosis Kaksha' };

export default function AccountantCollectionsPage() {
  const { roster, stats, currentPeriod } = getAccountantData();
  // Fee ledger covers enrolled (active) students for the current cycle.
  const active = roster
    .filter((s) => s.status === 'active')
    .sort((a, b) => {
      if (a.feeState !== b.feeState) return a.feeState === 'due' ? -1 : 1;
      return a.fullName.localeCompare(b.fullName);
    });

  return (
    <div className="space-y-6">
      <SampleDataBanner />

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Collections</h1>
        <p className="mt-1 text-[#4A5568]">
          Fee ledger for {currentPeriod}. Record payments and track dues.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Collected this month</p>
          <p className="mt-1 text-2xl font-bold text-[#10B981]">
            {formatINR(stats.collectedThisMonth)}
          </p>
        </div>
        <div className="rounded-[12px] border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-[#718096]">Outstanding dues</p>
          <p className="mt-1 text-2xl font-bold text-[#F59E0B]">
            {formatINR(stats.pendingDues)}
          </p>
        </div>
      </div>

      {active.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No active students"
          message="Fee ledgers appear here once students are enrolled."
        />
      ) : (
        <SectionCard title="Fee Ledger" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Class</th>
                  <th className="px-6 py-3 text-right">Monthly Fee</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {active.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F7FAFC]">
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1A2B4A]">{s.fullName}</p>
                        <p className="text-xs text-[#718096]">{s.registrationNumber}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#4A5568]">
                      {classLabel(s)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-[#1A2B4A]">
                      {formatINR(s.tuitionAfterScholarship)}
                    </td>
                    <td className="px-6 py-4">
                      {s.feeState === 'paid' ? (
                        <Badge tone="green">Paid</Badge>
                      ) : (
                        <Badge tone="amber">Due · {formatINR(s.amountDue)}</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.feeState === 'due' ? (
                        <button
                          type="button"
                          disabled
                          title="Coming soon"
                          className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-[#1295D8] px-3 py-1.5 text-xs font-semibold text-white opacity-60"
                        >
                          <IndianRupee size={14} /> Record Payment
                        </button>
                      ) : (
                        <span className="text-xs text-[#718096]">Cleared</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
