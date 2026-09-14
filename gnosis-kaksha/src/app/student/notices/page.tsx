import { Pin, Bell } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { getStudentData, formatDate } from '@/lib/student-data';

export const metadata = { title: 'Notices - Gnosis Kaksha' };

export default function StudentNoticesPage() {
  const { notices } = getStudentData();
  const sorted = [...notices].sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Notices</h1>
        <p className="mt-1 text-[#4A5568]">Announcements and updates for students.</p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notices yet"
          message="New announcements from the institute will appear here."
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
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-[#718096]">
                  {formatDate(n.date)}
                </span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-[#4A5568]">{n.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
