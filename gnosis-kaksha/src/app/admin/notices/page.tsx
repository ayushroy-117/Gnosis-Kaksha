'use client';

import { useState, useRef } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Pin,
  X,
  Paperclip,
  FileText,
  UploadCloud,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { useApi, apiFetch } from '@/hooks/useApi';
import { formatDate, type InstituteNotice } from '@/lib/institute-data';
import toast from 'react-hot-toast';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
type Audience = InstituteNotice['audience'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminNoticesPage() {
  const { data, error, loading, reload, setData } = useApi<{ notices: InstituteNotice[] }>('/api/admin/notices');
  const notices = data?.notices ?? [];
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New notice form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<Audience>('All');
  const [pinned, setPinned] = useState(false);

  // Attachment states
  const [attachmentMode, setAttachmentMode] = useState<'file' | 'link'>('file');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentSize, setAttachmentSize] = useState<string>('');
  const [directLinkUrl, setDirectLinkUrl] = useState<string>('');
  const [directLinkLabel, setDirectLinkLabel] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sorted = [...notices].sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
    return b.date.localeCompare(a.date);
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error(`${file.name} is ${formatFileSize(file.size)}. Attachments must be 5 MB or smaller — share a link instead.`);
      e.target.value = '';
      return;
    }

    setAttachedFile(file);
    setAttachmentName(file.name);
    setAttachmentSize(formatFileSize(file.size));

    // Convert to Data URL for in-browser download & persistence
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentDataUrl(reader.result as string);
    };
    reader.onerror = () => {
      toast.error('Could not read the selected file. Please try again.');
      removeAttachment();
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    setAttachmentDataUrl('');
    setAttachmentName('');
    setAttachmentSize('');
    setDirectLinkUrl('');
    setDirectLinkLabel('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setAudience('All');
    setPinned(false);
    removeAttachment();
    setIsModalOpen(false);
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please enter notice title and content');
      return;
    }

    // Determine final attachment URL & Name
    let finalUrl: string | null = null;
    let finalName: string | null = null;
    let finalSize: string | null = null;

    if (attachmentMode === 'file' && attachedFile && !attachmentDataUrl) {
      toast.error('The attachment is still being read. Please wait a moment and try again.');
      return;
    }
    if (attachmentMode === 'link' && directLinkUrl.trim() && !/^https?:\/\//i.test(directLinkUrl.trim())) {
      toast.error('Links must start with http:// or https://');
      return;
    }

    if (attachmentMode === 'file' && attachmentDataUrl) {
      finalUrl = attachmentDataUrl;
      finalName = attachmentName || 'Attached Document';
      finalSize = attachmentSize;
    } else if (attachmentMode === 'link' && directLinkUrl.trim()) {
      finalUrl = directLinkUrl.trim();
      finalName = directLinkLabel.trim() || directLinkUrl.trim().split('/').pop() || 'External Document';
      finalSize = 'External Link';
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ notice: InstituteNotice }>('/api/admin/notices', {
        method: 'POST',
        json: {
          title: title.trim(),
          content: content.trim(),
          audience,
          pinned,
          attachmentUrl: finalUrl,
          attachmentName: finalName,
          attachmentSize: finalSize,
        },
      });
      toast.success('Notice published successfully!');
      setData((prev) => ({ notices: [res.notice, ...(prev?.notices ?? [])] }));
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id: string, noticeTitle: string) => {
    if (!confirm(`Are you sure you want to delete notice "${noticeTitle}"?`)) return;

    setDeletingId(id);
    try {
      await apiFetch(`/api/admin/notices?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast.success('Notice removed');
      setData((prev) => (prev ? { notices: prev.notices.filter((n) => n.id !== id) } : prev));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete notice');
    } finally {
      setDeletingId(null);
    }
  };

  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading && !data) return <LoadingState label="Loading notices…" />;

  return (
    <div className="space-y-6">

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Notices &amp; Announcements</h1>
          <p className="mt-1 text-[#4A5568]">
            Publish announcements with documents and PDF attachments for students, parents, and staff.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition"
        >
          <Plus size={16} /> New Announcement
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
                    disabled={deletingId === n.id}
                    title="Delete notice"
                    aria-label="Delete notice"
                    className="rounded-md p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === n.id ? (
                      <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>

              <p className="mt-2 text-[15px] leading-relaxed text-[#4A5568]">{n.content}</p>

              {/* Attached file badge / download button */}
              {n.attachmentUrl && (
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <a
                    href={n.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={n.attachmentName || 'notice-document'}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-semibold text-[#1295D8] hover:bg-blue-100 hover:text-[#0c6390] transition shadow-2xs"
                  >
                    <Paperclip size={14} className="shrink-0" />
                    <span className="truncate max-w-[260px] sm:max-w-md">
                      {n.attachmentName || 'Download Attached Document'}
                    </span>
                    {n.attachmentSize && (
                      <span className="text-[10px] text-gray-500 font-normal">
                        ({n.attachmentSize})
                      </span>
                    )}
                    <ExternalLink size={12} className="shrink-0 ml-0.5 opacity-80" />
                  </a>
                </div>
              )}

              <p className="mt-3 text-xs text-[#718096]">Published {formatDate(n.date)}</p>
            </li>
          ))}
        </ul>
      )}

      {/* CREATE NOTICE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto my-auto">
            <button
              type="button"
              onClick={resetForm}
              aria-label="Close"
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            >
              <X size={20} />
            </button>

            <div className="mb-5">
              <h2 className="text-xl font-bold text-[#1A2B4A]">Publish New Announcement</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                This announcement will appear on student dashboards, parent portal, and public notice boards.
              </p>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-4">
              <Input
                label="Announcement Title"
                placeholder="e.g. Half-Yearly Examination Routine 2026"
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
                onChange={(e) => setAudience(e.target.value as Audience)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notice Content / Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter detailed announcement message or instructions..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-hidden focus:border-[#1295D8] focus:ring-2 focus:ring-[rgba(18,149,216,0.15)] text-sm text-[#0F172A] bg-white placeholder:text-slate-500 font-medium"
                  required
                />
              </div>

              {/* ══════════════════════════════════════
                  FILE ATTACHMENT SECTION
                  ══════════════════════════════════════ */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Paperclip size={14} className="text-[#1295D8]" /> File Attachment
                  </label>

                  {/* Mode switcher: upload file or paste URL */}
                  <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setAttachmentMode('file')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        attachmentMode === 'file'
                          ? 'bg-[#1295D8] text-white shadow-2xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttachmentMode('link')}
                      className={`px-2.5 py-1 rounded-md transition ${
                        attachmentMode === 'link'
                          ? 'bg-[#1295D8] text-white shadow-2xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Web Link / Drive
                    </button>
                  </div>
                </div>

                {/* Option A: Upload File */}
                {attachmentMode === 'file' && (
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.txt"
                      className="hidden"
                    />

                    {attachedFile ? (
                      <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-white p-3 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-[#1295D8]">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate max-w-[240px]">
                              {attachmentName}
                            </p>
                            <p className="text-[10px] text-gray-500 font-medium">
                              {attachmentSize} • Ready to publish
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={removeAttachment}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Remove file"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-4 text-center cursor-pointer hover:border-[#1295D8] hover:bg-blue-50/40 transition group"
                      >
                        <UploadCloud size={24} className="text-gray-400 group-hover:text-[#1295D8] transition" />
                        <p className="mt-1 text-xs font-semibold text-gray-700 group-hover:text-[#1295D8]">
                          Click to select a file to attach
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          PDF, Word Docs, Excel, or Images up to 5 MB
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Option B: Direct Document / Drive Link */}
                {attachmentMode === 'link' && (
                  <div className="space-y-2">
                    <Input
                      label="Document / PDF URL"
                      placeholder="https://drive.google.com/... or https://..."
                      value={directLinkUrl}
                      onChange={(e) => setDirectLinkUrl(e.target.value)}
                    />
                    <Input
                      label="Attachment Button Label (Optional)"
                      placeholder="e.g. Download Exam Routine PDF"
                      value={directLinkLabel}
                      onChange={(e) => setDirectLinkLabel(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Pin to top checkbox */}
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
                  onClick={resetForm}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] hover:opacity-95 text-white"
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
