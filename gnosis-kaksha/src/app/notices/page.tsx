'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Pin, Bell, Paperclip, ExternalLink, Download } from 'lucide-react';

export default function Notices() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/notices')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch notices');
        return res.json();
      })
      .then((data) => {
        const mapped = (data.notices ?? []).map((notice: any) => ({
          id: notice.id,
          title: notice.title,
          content: notice.content,
          date: notice.published_at || notice.date,
          isPinned: notice.is_pinned ?? notice.isPinned ?? notice.pinned,
          external_url: notice.external_url || notice.attachmentUrl || null,
          attachmentName:
            notice.attachmentName ||
            (notice.external_url
              ? notice.external_url.split('/').pop()?.split('?')[0] || 'Attached Document'
              : 'Attached Document'),
          attachmentSize: notice.attachmentSize || null,
        }));
        setNotices(mapped);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const pinnedNotices = notices.filter((n) => n.isPinned);
  const regularNotices = notices.filter((n) => !n.isPinned);

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-blue-50 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-black text-[#1A2B4A] mb-4">Notices</h1>
          <p className="text-lg md:text-xl text-[#4A5568] font-medium">
            Stay updated with the latest announcements, routines, and circulars
          </p>
          <div className="h-1 w-24 bg-linear-to-r from-[#1295D8] to-orange-400 mx-auto mt-6"></div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col gap-3"
              >
                <div className="h-5 w-1/3 bg-gray-200 rounded" />
                <div className="h-4 w-full bg-gray-200 rounded" />
                <div className="h-4 w-5/6 bg-gray-200 rounded" />
                <div className="h-3 w-1/4 bg-gray-200 rounded mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="text-center py-24">
            <p className="text-[#4A5568] text-lg font-medium">
              Notices currently unavailable. Please check back shortly.
            </p>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Pinned Notices */}
            {pinnedNotices.length > 0 && (
              <div className="mb-14">
                <h2 className="text-2xl md:text-3xl font-bold text-[#1A2B4A] mb-6 flex items-center gap-3">
                  <Pin className="h-6 w-6 text-[#1295D8]" />
                  Important Announcements
                </h2>
                <div className="space-y-5">
                  {pinnedNotices.map((notice) => (
                    <Card
                      key={notice.id}
                      className="border-l-4 border-[#1295D8] hover:shadow-xl transition duration-300 bg-white p-6"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-[#1A2B4A] mb-2">{notice.title}</h3>
                          {notice.content && (
                            <p className="text-[#4A5568] mb-3 leading-relaxed text-sm md:text-base">
                              {notice.content}
                            </p>
                          )}

                          {/* Attachment button */}
                          {notice.external_url && (
                            <div className="mb-3.5">
                              <a
                                href={notice.external_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={notice.attachmentName}
                                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-[#1295D8] hover:bg-blue-100 hover:text-[#0c6390] transition shadow-2xs"
                              >
                                <Paperclip size={14} className="shrink-0" />
                                <span>{notice.attachmentName}</span>
                                {notice.attachmentSize && (
                                  <span className="text-[10px] text-gray-500 font-normal">
                                    ({notice.attachmentSize})
                                  </span>
                                )}
                                <ExternalLink size={12} className="shrink-0 opacity-80" />
                              </a>
                            </div>
                          )}

                          <p className="text-xs text-[#718096] font-medium">
                            {new Date(notice.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="ml-4 shrink-0">
                          <div className="bg-blue-100 rounded-full p-2.5 text-[#1295D8]">
                            <Pin className="h-5 w-5" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Regular Notices */}
            <div>
              <h2 className="text-2xl font-bold text-[#1A2B4A] mb-6">Latest Updates</h2>
              <div className="space-y-4">
                {regularNotices.map((notice) => (
                  <Card key={notice.id} className="hover:shadow-md transition bg-white p-6">
                    <div>
                      <h3 className="text-lg font-bold text-[#1A2B4A] mb-2">{notice.title}</h3>
                      {notice.content && (
                        <p className="text-[#4A5568] mb-3 leading-relaxed text-sm">
                          {notice.content}
                        </p>
                      )}

                      {/* Attachment button */}
                      {notice.external_url && (
                        <div className="mb-3">
                          <a
                            href={notice.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={notice.attachmentName}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-[#1295D8] hover:bg-blue-100 hover:text-[#0c6390] transition shadow-2xs"
                          >
                            <Paperclip size={14} className="shrink-0" />
                            <span>{notice.attachmentName}</span>
                            {notice.attachmentSize && (
                              <span className="text-[10px] text-gray-500 font-normal">
                                ({notice.attachmentSize})
                              </span>
                            )}
                            <ExternalLink size={12} className="shrink-0 opacity-80" />
                          </a>
                        </div>
                      )}

                      <p className="text-xs text-[#718096] font-medium">
                        {new Date(notice.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
