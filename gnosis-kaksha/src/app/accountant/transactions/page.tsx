import { Receipt, Download } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { getAccountantData, formatINR, formatDate } from '@/lib/institute-data';

export const metadata = { title: 'Transactions - Gnosis Kaksha' };

export default function AccountantTransactionsPage() {
  const { transactions } = getAccountantData();
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <SampleDataBanner />

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Transactions</h1>
        <p className="mt-1 text-[#4A5568]">
          All fee receipts issued. Total recorded: {formatINR(total)}.
        </p>
      </div>

      {transactions.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions yet"
          message="Receipts for recorded payments will be listed here."
        />
      ) : (
        <SectionCard title="Receipts" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  <th className="px-6 py-3">Receipt No.</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Student</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F7FAFC]">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-[#4A5568]">
                      {t.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-[#4A5568]">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#1A2B4A]">
                      {t.studentName}
                    </td>
                    <td className="px-6 py-4 text-[#4A5568]">{t.description}</td>
                    <td className="px-6 py-4">
                      <Badge tone="gray">{t.method}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-[#1A2B4A]">
                      {formatINR(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        disabled
                        title="Coming soon"
                        aria-label="Download receipt"
                        className="cursor-not-allowed rounded-md p-1.5 text-[#718096] opacity-60"
                      >
                        <Download size={16} />
                      </button>
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
