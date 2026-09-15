'use client';

import { useState } from 'react';
import { Megaphone, Plus, Trash2, Pin, X } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { getAdminData, formatDate, InstituteNotice } from '@/lib/institute-data';
import toast from 'react-hot-toast';

export default function AdminNoticesPage() {
  const initialData = getAdminData();
  const [notices, setNotices] = useState<InstituteNotice[]>(initialData.notices);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New notice form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<'All' | 'Students' | 'Parents' | 'Staff'>('All');
  const [pinned, setPinned] = useState(false);

  const sorted = [...notices].sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
    return b.date.localeCompare(a.date);
  });

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please enter notice title and content');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, audience, pinned }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Notice published successfully!');
        setNotices((prev) => [data.notice, ...prev]);
        setIsModalOpen(false);
        setTitle('');
        setContent('');
        setAudience('All');
        setPinned(false);
      } else {
        toast.error(data.error || 'Failed to publish notice');
      }
    } catch {
      toast.error('An error occurred while publishing notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id: string, noticeTitle: string) => {
    if (!confirm(`Are you sure you want to delete notice "${noticeTitle}"?`)) return;

    try {
      const res = await fetch(`/api/admin/notices?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Notice removed');
        setNotices((prev) => prev.filter((n) => n.id !== id));
      } else {
        toast.error('Failed to delete notice');
      }
    } catch {
      toast.error('An error occurred while deleting notice');
    }
  };

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
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition"
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
                  <Badge tone="gray">{n.audience}</Badge>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDeleteNotice(n.id, n.title)}
                    title="Delete notice"
                    aria-label="Delete notice"
                    className="rounded-md p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
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

      {/* CREATE NOTICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            >
              <X size={20} />
            </button>

            <div className="mb-5">
              <h2 className="text-xl font-bold text-[#1A2B4A]">Publish New Announcement</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                This announcement will appear on the student dashboard and public notices board.
              </p>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-4">
              <Input
                label="Notice Title"
                placeholder="e.g. Unit Test Exam Schedule"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Select
                label="Target Audience"
                options={[
                  { value: 'All', label: 'All (Everyone)' },
                  { value: 'Students', label: 'Students' },
                  { value: 'Parents', label: 'Parents' },
                  { value: 'Staff', label: 'Staff' },
                ]}
                value={audience}
                onChange={(e) => setAudience(e.target.value as any)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notice Content / Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter detailed announcement message..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1295D8] text-sm text-[#1A2B4A]"
                  required
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="w-4 h-4 text-[#1295D8] rounded border-gray-300 focus:ring-[#1295D8]"
                />
                <span className="text-sm font-medium text-gray-700">Pin to top of notice boards</span>
              </label>

              <div className="flex gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  className="flex-1 bg-[#1295D8] hover:bg-[#2E5EAA]"
                >
                  Publish Announcement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
