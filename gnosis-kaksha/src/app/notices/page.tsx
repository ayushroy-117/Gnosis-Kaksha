'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Pin, Bell } from 'lucide-react';

export default function Notices() {
  const [notices, setNotices] = useState<any[]>([]);

  useEffect(() => {
    // Mock data - will be replaced with DB calls
    setNotices([
      {
        id: 1,
        title: 'Summer Batch Registration Open',
        content: 'Registration for our Summer 2024 batch is now open. Limited seats available. Apply now to secure your spot!',
        date: '2024-06-10',
        isPinned: true,
      },
      {
        id: 2,
        title: 'Scholarship Announcement',
        content: 'We are proud to announce our new scholarship program for meritorious students. Upto 50% discount on tuition fees.',
        date: '2024-06-08',
        isPinned: true,
      },
      {
        id: 3,
        title: 'Holiday Break Schedule',
        content: 'The institution will remain closed from June 15 to June 30 for the summer break. Classes will resume from July 1st.',
        date: '2024-06-05',
        isPinned: false,
      },
      {
        id: 4,
        title: 'New Courses Launched',
        content: 'Exciting new courses in AI and Machine Learning are now available. Enroll today and master the future of technology.',
        date: '2024-06-01',
        isPinned: false,
      },
      {
        id: 5,
        title: 'Exam Schedule Released',
        content: 'The semester exam schedule has been released. Download the full timetable from the student portal.',
        date: '2024-05-28',
        isPinned: false,
      },
    ]);
  }, []);

  const pinnedNotices = notices.filter(n => n.isPinned);
  const regularNotices = notices.filter(n => !n.isPinned);

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-blue-50 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h1 className="text-5xl md:text-6xl font-black text-[#1A2B4A] mb-4">Notices</h1>
          <p className="text-lg md:text-xl text-[#4A5568] font-medium">Stay updated with the latest announcements and important information</p>
          <div className="h-1 w-24 bg-linear-to-r from-[#1295D8] to-orange-400 mx-auto mt-6"></div>
        </div>

        {/* Pinned Notices */}
        {pinnedNotices.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-[#1A2B4A] mb-8 flex items-center gap-3">
              <Pin className="h-7 w-7 text-[#1295D8]" />
              Important Notices
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
                      <p className="text-[#4A5568] mb-4 leading-relaxed">{notice.content}</p>
                      <p className="text-sm text-[#718096] font-medium">
                        {new Date(notice.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className="bg-blue-100 rounded-full p-3">
                        <Pin className="h-6 w-6 text-[#1295D8]" />
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
              <Card key={notice.id} className="hover:shadow-lg transition">
                <div>
                  <h3 className="text-lg font-bold text-[#1A2B4A] mb-2\">{notice.title}</h3>
                  <p className="text-[#4A5568] mb-3\">{notice.content}</p>
                  <p className="text-sm text-[#718096]\">
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
      </div>
    </div>
  );
}
