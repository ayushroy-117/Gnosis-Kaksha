'use client';

import { useRef, useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Download,
  Search,
  X,
  Upload,
} from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useApi, apiFetch } from '@/hooks/useApi';
import { SUBJECT_FEES } from '@/lib/fees';
import {
  MATERIAL_CATEGORIES,
  type StudyMaterial,
  type MaterialCategory,
} from '@/lib/study-materials';
import toast from 'react-hot-toast';

const CLASSES = Object.keys(SUBJECT_FEES).map(Number).sort((a, b) => a - b);
const subjectsForClass = (cls: number) => Object.keys(SUBJECT_FEES[cls] ?? {});

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.zip'];

function formatBytes(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function TeacherStudyMaterialPage() {
  const { data, error, loading, reload, setData } = useApi<{ materials: StudyMaterial[] }>('/api/study-material');
  const materials = data?.materials ?? [];
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formClass, setFormClass] = useState('10');
  const [formSubject, setFormSubject] = useState(() => subjectsForClass(10)[0] ?? '');
  const [formCategory, setFormCategory] = useState<MaterialCategory>('Notes');
  const [formDescription, setFormDescription] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formSubjects = subjectsForClass(Number(formClass));

  const filtered = materials.filter((m) => {
    if (classFilter !== 'all' && m.classNumber !== Number(classFilter)) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeModal = () => {
    setShowUploadModal(false);
    resetForm();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setFormFile(null);
      return;
    }
    const lower = file.name.toLowerCase();
    if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      toast.error('Only PDF, DOCX or ZIP files can be uploaded.');
      e.target.value = '';
      setFormFile(null);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('File is larger than 10 MB.');
      e.target.value = '';
      setFormFile(null);
      return;
    }
    setFormFile(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formTitle.trim().length < 3) {
      toast.error('Please enter a title of at least 3 characters');
      return;
    }
    if (!formSubject) {
      toast.error('Please choose a subject');
      return;
    }
    if (!formFile) {
      toast.error('Please choose a file to upload');
      return;
    }

    const body = new FormData();
    body.append('title', formTitle.trim());
    body.append('description', formDescription.trim());
    body.append('classNumber', formClass);
    body.append('subject', formSubject);
    body.append('category', formCategory);
    body.append('file', formFile);

    setIsSubmitting(true);
    try {
      const { material } = await apiFetch<{ material: StudyMaterial }>('/api/study-material', {
        method: 'POST',
        body,
      });
      toast.success('Study material published successfully!');
      setData((prev) => ({ materials: [material, ...(prev?.materials ?? [])] }));
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload study material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    setDeletingId(id);
    try {
      await apiFetch(`/api/study-material?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setData((prev) => (prev ? { materials: prev.materials.filter((m) => m.id !== id) } : prev));
      toast.success('Study material deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete study material');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && !data) return <LoadingState label="Loading study material…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load study material.'} onRetry={reload} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Study Material Management</h1>
          <p className="mt-1 text-[#4A5568]">
            Upload notes, question papers, and worksheets for students to access.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 self-start"
        >
          <Plus size={16} /> Upload New Material
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-white p-4 border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">Filter Class:</span>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs focus:border-[#1295D8] focus:outline-none"
          >
            <option value="all">All Classes</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                Class {c}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search material title or subject..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:border-[#1295D8] focus:outline-none"
          />
        </div>
      </div>

      {/* Materials Table */}
      <SectionCard title={`Published Materials (${filtered.length})`} bodyClassName="p-0">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={BookOpen}
              title={materials.length === 0 ? 'No study material yet' : 'No matching material'}
              message={
                materials.length === 0
                  ? 'Upload notes, PYQs or worksheets and they will appear here for students.'
                  : 'Try a different class or search term.'
              }
            />
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                <th className="px-6 py-3">Title & Subject</th>
                <th className="px-6 py-3">Class</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Downloads</th>
                <th className="px-6 py-3">Uploaded By</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#F7FAFC] transition">
                  <td className="px-6 py-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1A2B4A]">{item.title}</p>
                      <p className="text-xs text-[#1295D8] font-medium">{item.subject} · {item.fileType}{item.fileSize ? ` · ${item.fileSize}` : ''}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="rounded-full bg-[#CDE6F7] px-2.5 py-0.5 text-xs font-bold text-[#2E5EAA]">
                      Class {item.classNumber}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono text-xs">
                    {item.downloads}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                    {item.uploadedBy}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <a
                      href={item.fileUrl}
                      className="inline-flex items-center gap-1 rounded-lg p-1.5 text-[#1295D8] hover:bg-blue-50 hover:text-[#2E5EAA] transition"
                      title={`Download ${item.fileName ?? item.title}`}
                    >
                      <Download size={16} />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      disabled={deletingId === item.id}
                      className="inline-flex items-center gap-1 rounded-lg p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete material"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </SectionCard>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            >
              <X size={20} />
            </button>

            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2E5EAA] bg-[#CDE6F7] px-2.5 py-0.5 rounded-full">
                Teacher Desk
              </span>
              <h2 className="text-xl font-bold text-[#1A2B4A] mt-1">Upload Study Material</h2>
              <p className="text-xs text-gray-500">Publish notes, formula sheets, or PYQs for students.</p>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Document Title *
                </label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Class 10 Trigonometry Formula Sheet"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Class *
                  </label>
                  <select
                    value={formClass}
                    onChange={(e) => {
                      setFormClass(e.target.value);
                      const subs = subjectsForClass(Number(e.target.value));
                      if (!subs.includes(formSubject)) setFormSubject(subs[0] ?? '');
                    }}
                    className="w-full rounded-lg border-2 border-gray-300 p-2 text-xs bg-white focus:border-[#1295D8] focus:outline-none"
                  >
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>
                        Class {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MaterialCategory)}
                    className="w-full rounded-lg border-2 border-gray-300 p-2 text-xs bg-white focus:border-[#1295D8] focus:outline-none"
                  >
                    {MATERIAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Subject *
                </label>
                <select
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full rounded-lg border-2 border-gray-300 p-2 text-xs bg-white focus:border-[#1295D8] focus:outline-none"
                >
                  {formSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description / Chapter Summary
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Briefly describe what this material covers..."
                  className="w-full rounded-lg border-2 border-gray-300 p-2 text-xs bg-white focus:border-[#1295D8] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="material-file" className="block text-xs font-semibold text-gray-700 mb-1">
                  File * <span className="font-normal text-gray-500">(PDF, DOCX or ZIP, up to 10 MB)</span>
                </label>
                <input
                  id="material-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.zip"
                  onChange={handleFileChange}
                  required
                  className="block w-full rounded-lg border-2 border-dashed border-gray-300 p-2 text-xs text-gray-700 bg-white file:mr-3 file:rounded-md file:border-0 file:bg-[#CDE6F7] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#2E5EAA] hover:file:bg-[#b9dcf3] focus:border-[#1295D8] focus:outline-none"
                />
                {formFile && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-600">
                    <Upload size={12} className="text-[#1295D8]" /> {formFile.name} · {formatBytes(formFile.size)}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={!formFile || !formTitle.trim()}
                  className="flex-1"
                >
                  Upload & Publish
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
