import { Megaphone, Plus, Pencil, Trash2, Pin } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { getAdminData, formatDate } from '@/lib/institute-data';

export const metadata = { title: 'Manage Notices - Gnosis Kaksha' };

export default function AdminNoticesPage() {
  const { notices } = getAdminData();
  const sorted = [...notices].sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="space-y-6">
      <SampleDataBanner />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Notices</h1>
          <p className="mt-1 text-[#4A5568]">
            Publish and manage announcements for students, parents and staff.
          </p>
        </div>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-gradient-to-r from-[#1295D8] to-[#50B4F2] px-5 py-2.5 text-sm font-semibold text-white opacity-60"
        >
          <Plus size={16} /> New Notice
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No notices published"
          message="Announcements you publish will be listed here."
        />
      ) : (
        <ul className="space-y-4">
          {sorted.map((n) => (
            <li
              key={n.id}
              className={`rounded-[12px] border bg-white p-5 shadow-sm ${
                n.pinned ? 'border-l-4 border-l-[#1295D8] border-gray-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  {n.pinned && <Pin size={16} className="shrink-0 text-[#1295D8]" />}
                  <h2 className="text-lg font-semibold text-[#1A2B4A]">{n.title}</h2>
                  <Badge tone="gray">{n.audience}</Badge>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled
                    title="Coming soon"
                    aria-label="Edit notice"
                    className="cursor-not-allowed rounded-md p-1.5 text-[#718096] opacity-60"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Coming soon"
                    aria-label="Delete notice"
                    className="cursor-not-allowed rounded-md p-1.5 text-[#718096] opacity-60"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-[#4A5568]">{n.content}</p>
              <p className="mt-3 text-xs text-[#718096]">Published {formatDate(n.date)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
