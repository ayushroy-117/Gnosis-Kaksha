'use client';

import { Pin, Bell, Paperclip, ExternalLink } from 'lucide-react';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { formatDate } from '@/lib/student-data';
import { useStudentPortal } from '@/hooks/useStudentPortal';

export default function StudentNoticesPage() {
  const { data, error, loading, reload } = useStudentPortal();

  if (loading && !data) return <LoadingState label="Loading notices…" />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return null;

  const { notices } = data;
  const sorted = [...notices].sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Notices &amp; Announcements</h1>
        <p className="mt-1 text-[#4A5568]">Official institute circulars, schedules, and document attachments.</p>
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
              className={`rounded-[12px] border bg-white p-5 shadow-sm transition hover:shadow-md ${
                n.pinned ? 'border-l-4 border-l-[#1295D8] border-gray-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {n.pinned && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1295D8] bg-[#CDE6F7] px-2 py-0.5 rounded">
                      <Pin size={12} /> Pinned
                    </span>
                  )}
                  <h2 className="text-lg font-semibold text-[#1A2B4A]">{n.title}</h2>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-[#718096]">
                  {formatDate(n.date)}
                </span>
              </div>

              <p className="mt-2 text-[15px] leading-relaxed text-[#4A5568]">{n.content}</p>

              {/* Attached file link */}
              {n.attachmentUrl && (
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <a
                    href={n.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={n.attachmentName || 'notice-document'}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-semibold text-[#1295D8] hover:bg-blue-100 hover:text-[#0c6390] transition shadow-2xs"
                  >
                    <Paperclip size={14} className="shrink-0" />
                    <span className="truncate max-w-[260px] sm:max-w-md">
                      {n.attachmentName || 'Download Attached File'}
                    </span>
                    {n.attachmentSize && (
                      <span className="text-[10px] text-gray-500 font-normal">
                        ({n.attachmentSize})
                      </span>
                    )}
                    <ExternalLink size={12} className="shrink-0 opacity-80" />
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
