'use client';

import { useState } from 'react';
import {
  BookOpen,
  FileText,
  Upload,
  Plus,
  Trash2,
  Download,
  Eye,
  Search,
  Filter,
  X,
  CheckCircle2,
} from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  getAllStudyMaterials,
  StudyMaterial,
  MaterialCategory,
} from '@/lib/study-materials';
import toast from 'react-hot-toast';

const CLASSES = [9, 10, 11, 12, 5, 6, 7, 8];
const CATEGORIES: MaterialCategory[] = [
  'Notes',
  'PYQ',
  'Formula Sheet',
  'Worksheet',
  'Syllabus',
];
const SUBJECTS = [
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Bengali',
  'Economics',
];

export default function TeacherStudyMaterialPage() {
  const [materials, setMaterials] = useState<StudyMaterial[]>(() =>
    getAllStudyMaterials()
  );
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formClass, setFormClass] = useState('10');
  const [formSubject, setFormSubject] = useState('Physics');
  const [formCategory, setFormCategory] = useState<MaterialCategory>('Notes');
  const [formDescription, setFormDescription] = useState('');
  const [formFileSize, setFormFileSize] = useState('2.5 MB');

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

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Please enter a title for the study material');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/study-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          classNumber: Number(formClass),
          subject: formSubject,
          category: formCategory,
          fileSize: formFileSize,
          uploadedBy: 'Teacher (Faculty)',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Study material published successfully!');
        setMaterials((prev) => [data.material, ...prev]);
        setShowUploadModal(false);
        setFormTitle('');
        setFormDescription('');
      } else {
        toast.error(data.error || 'Failed to upload study material');
      }
    } catch {
      toast.error('Network error uploading study material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/study-material?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
        toast.success('Study material deleted');
      }
    } catch {
      toast.error('Failed to delete study material');
    }
  };

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
                      <p className="text-xs text-[#1295D8] font-medium">{item.subject} · {item.fileSize}</p>
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
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="inline-flex items-center gap-1 rounded-lg p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 transition"
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
      </SectionCard>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
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
                    onChange={(e) => setFormClass(e.target.value)}
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
                    {CATEGORIES.map((cat) => (
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
                  {SUBJECTS.map((sub) => (
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

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
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
