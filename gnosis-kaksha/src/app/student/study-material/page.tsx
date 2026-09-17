'use client';

import { useState, useMemo } from 'react';
import {
  BookOpen,
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { Button } from '@/components/ui/Button';
import {
  getAllStudyMaterials,
  StudyMaterial,
  MaterialCategory,
} from '@/lib/study-materials';
import { getStudentData } from '@/lib/student-data';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

const CATEGORIES: ('All' | MaterialCategory)[] = [
  'All',
  'Notes',
  'PYQ',
  'Formula Sheet',
  'Worksheet',
  'Syllabus',
];

export default function StudentStudyMaterialPage() {
  const { user } = useAuth();
  const studentData = useMemo(() => {
    const identifier = user?.registrationNumber || user?.email || user?.id;
    return getStudentData(identifier);
  }, [user]);

  const { profile, subjects } = studentData;
  const studentClass = profile.classNumber;

  const [materials, setMaterials] = useState<StudyMaterial[]>(() =>
    getAllStudyMaterials()
  );
  const [activeTab, setActiveTab] = useState<'my_class' | 'all'>('my_class');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterial | null>(null);

  const filtered = useMemo(() => {
    return materials.filter((item) => {
      if (activeTab === 'my_class' && item.classNumber !== studentClass) {
        return false;
      }
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchSub = item.subject.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchSub) return false;
      }
      return true;
    });
  }, [materials, activeTab, studentClass, selectedCategory, searchQuery]);

  const handleDownload = (item: StudyMaterial) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, downloads: m.downloads + 1 } : m))
    );
    fetch(`/api/study-material?download=${item.id}`).catch(() => {});

    // Create dummy PDF download
    const dummyContent = `%PDF-1.4\n1 0 obj\n<< /Title (${item.title}) >>\nendobj\n%%EOF`;
    const blob = new Blob([dummyContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded: ${item.title}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Study Materials</h1>
          <p className="mt-1 text-[#4A5568]">
            Curated lecture notes, previous year question papers, and formula sheets for Class {studentClass}.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-gray-100 p-1 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('my_class')}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
              activeTab === 'my_class'
                ? 'bg-white text-[#1295D8] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Class {studentClass} ({materials.filter((m) => m.classNumber === studentClass).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
              activeTab === 'all'
                ? 'bg-white text-[#1295D8] shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Classes ({materials.length})
          </button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-white p-4 border border-gray-200 shadow-xs">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-1 flex items-center gap-1">
            <Filter size={13} /> Type:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                selectedCategory === cat
                  ? 'bg-[#1295D8] text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or topics..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:border-[#1295D8] focus:outline-none"
          />
        </div>
      </div>

      {/* Materials List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <BookOpen size={24} />
          </div>
          <h3 className="mt-4 text-base font-bold text-[#1A2B4A]">No study materials found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No materials match your current category or search query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const isEnrolledSubject = subjects.some(
              (s) => s.name.toLowerCase() === item.subject.toLowerCase()
            );

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-[#CDE6F7] px-2 py-0.5 text-xs font-bold text-[#2E5EAA]">
                        Class {item.classNumber}
                      </span>
                      <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        {item.category}
                      </span>
                    </div>
                    {isEnrolledSubject && (
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                        ✓ Enrolled
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold uppercase tracking-wider text-[#1295D8]">
                    {item.subject}
                  </span>
                  <h3 className="text-sm font-bold text-[#1A2B4A] mt-0.5 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-1.5">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mb-3">
                    <span className="truncate max-w-[150px]">✍️ {item.uploadedBy}</span>
                    <span>{item.fileSize} · {item.downloads} downloads</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewMaterial(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                    >
                      <Eye size={13} /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#1295D8] hover:bg-[#2E5EAA] px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs transition"
                    >
                      <Download size={13} /> Download
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F8FAFC]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1295D8]">
                  Class {previewMaterial.classNumber} · {previewMaterial.subject} · {previewMaterial.category}
                </span>
                <h3 className="text-base font-bold text-[#1A2B4A] mt-0.5">
                  {previewMaterial.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMaterial(null)}
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Description
                </p>
                <p className="text-sm text-gray-700">{previewMaterial.description}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Uploaded by: <b>{previewMaterial.uploadedBy}</b> on {previewMaterial.createdAt}
                </p>
              </div>

              <div className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center bg-[#FBFDFE]">
                <FileText size={32} className="mx-auto text-[#1295D8] mb-2" />
                <p className="text-sm font-bold text-[#1A2B4A]">PDF Document ({previewMaterial.fileSize})</p>
                <p className="text-xs text-gray-500 mt-1">
                  Verified study resource for Gnosis Kaksha enrolled students.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-gray-100 bg-[#F8FAFC]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewMaterial(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  handleDownload(previewMaterial);
                  setPreviewMaterial(null);
                }}
                className="flex items-center gap-1.5"
              >
                <Download size={14} /> Download PDF ({previewMaterial.fileSize})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
