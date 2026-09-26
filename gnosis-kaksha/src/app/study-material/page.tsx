'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  BookOpen,
  FileText,
  Download,
  Eye,
  Filter,
  GraduationCap,
  Sparkles,
  ArrowRight,
  X,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { StudyMaterial, MaterialCategory } from '@/lib/study-materials';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/format';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import toast from 'react-hot-toast';

const CLASSES: (number | 'All')[] = ['All', 9, 10, 11, 12];
const CATEGORIES: ('All' | MaterialCategory)[] = [
  'All',
  'Notes',
  'PYQ',
  'Formula Sheet',
  'Worksheet',
  'Syllabus',
];

export default function StudyMaterialPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data, error, loading, reload, setData } = useApi<{ materials: StudyMaterial[] }>('/api/study-material');
  const materials = useMemo(() => data?.materials ?? [], [data]);
  const subjects = useMemo(
    () => ['All', ...Array.from(new Set(materials.map((m) => m.subject))).sort()],
    [materials]
  );
  const [selectedClass, setSelectedClass] = useState<number | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterial | null>(null);

  const filtered = useMemo(() => {
    return materials.filter((item) => {
      if (selectedClass !== 'All' && item.classNumber !== selectedClass) {
        return false;
      }
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      if (
        selectedSubject !== 'All' &&
        item.subject.toLowerCase() !== selectedSubject.toLowerCase()
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchSub = item.subject.toLowerCase().includes(q);
        const matchTeacher = item.uploadedBy.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchSub && !matchTeacher) {
          return false;
        }
      }
      return true;
    });
  }, [materials, selectedClass, selectedCategory, selectedSubject, searchQuery]);

  const handleDownload = (item: StudyMaterial) => {
    if (authLoading) {
      toast('Checking your sign-in, please try again in a moment.');
      return;
    }
    if (!user) {
      toast.error('Sign in to download');
      router.push('/auth?next=/study-material');
      return;
    }
    setData((prev) =>
      prev
        ? { materials: prev.materials.map((m) => (m.id === item.id ? { ...m, downloads: m.downloads + 1 } : m)) }
        : prev
    );
    window.location.assign(item.fileUrl);
  };

  const handleShare = (item: StudyMaterial) => {
    const text = `Check out this study material from Gnosis Kaksha: "${item.title}" for Class ${item.classNumber} (${item.subject}).`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      navigator.share({ title: item.title, text, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard
        .writeText(`${text}\n${shareUrl}`)
        .then(() => toast.success('Link copied to clipboard!'))
        .catch(() => toast.error('Could not copy the link.'));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EBF5FB] via-[#F4F9FD] to-[#F8FAFC] py-16 sm:py-20 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#CDE6F7] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#2E5EAA] mb-4">
            <Sparkles size={14} /> Gnosis Kaksha Knowledge Hub
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-[#1A2B4A] tracking-tight">
            Free Study Materials & Notes
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-[#4A5568]">
            Curated chapter notes, solved past year board question papers (PYQs), formula cheat-sheets, and practice worksheets created by our expert faculty.
          </p>

          {/* Search Bar */}
          <div className="mt-8 max-w-2xl mx-auto relative">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic, chapter, subject, or faculty..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-gray-300 bg-white text-gray-800 text-sm shadow-sm focus:border-[#1295D8] focus:outline-none focus:ring-4 focus:ring-[#1295D8]/10 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Class Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-gray-200 mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-2 flex items-center gap-1">
            <GraduationCap size={15} /> Class:
          </span>
          {CLASSES.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => setSelectedClass(cls)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                selectedClass === cls
                  ? 'bg-[#1295D8] text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cls === 'All' ? 'All Classes' : `Class ${cls}`}
            </button>
          ))}
        </div>

        {/* Categories & Subjects Filter Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-1 flex items-center gap-1">
              <Filter size={14} /> Type:
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-[#1A2B4A] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat === 'All' ? 'All Types' : cat}
              </button>
            ))}
          </div>

          {/* Subjects Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Subject:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-xs focus:border-[#1295D8] focus:outline-none"
            >
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-600">
            Showing <span className="font-bold text-[#1A2B4A]">{filtered.length}</span> study material
            {filtered.length === 1 ? '' : 's'}
          </p>
          {(selectedClass !== 'All' || selectedCategory !== 'All' || selectedSubject !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedClass('All');
                setSelectedCategory('All');
                setSelectedSubject('All');
                setSearchQuery('');
              }}
              className="text-xs text-[#1295D8] hover:text-[#2E5EAA] font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Materials Grid */}
        {loading && !data ? (
          <LoadingState label="Loading study material…" />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : materials.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <BookOpen size={24} />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#1A2B4A]">No study material published yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Our faculty will publish notes and papers here soon. Please check back later.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <BookOpen size={24} />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#1A2B4A]">No study materials found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your class, subject, or search filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-xs hover:shadow-md transition duration-200"
              >
                <div>
                  {/* Card Tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#CDE6F7] px-2.5 py-0.5 text-xs font-bold text-[#2E5EAA]">
                      Class {item.classNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        {item.category}
                      </span>
                      <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono text-gray-600">
                        {item.fileType} · {item.fileSize}
                      </span>
                    </div>
                  </div>

                  {/* Title & Subject */}
                  <div className="mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1295D8]">
                      {item.subject}
                    </span>
                    <h3 className="text-base font-bold text-[#1A2B4A] leading-snug mt-0.5">
                      {item.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-600 line-clamp-3 mb-4">
                    {item.description}
                  </p>
                </div>

                <div>
                  {/* Meta: Teacher & Downloads */}
                  <div className="border-t border-gray-100 pt-3 mb-4 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="truncate max-w-[170px]" title={item.uploadedBy}>
                      ✍️ {item.uploadedBy}
                    </span>
                    <span>📥 {item.downloads} downloads</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewMaterial(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                    >
                      <Eye size={14} /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1295D8] hover:bg-[#2E5EAA] px-3 py-2 text-xs font-semibold text-white shadow-xs transition"
                    >
                      <Download size={14} /> Download {item.fileType}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShare(item)}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition"
                      title="Share Material"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Banner: Admission CTA */}
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-[#1A2B4A] via-[#1295D8] to-[#2E5EAA] p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#CDE6F7] bg-white/10 px-3 py-1 rounded-full">
              Admission Open 2026-27
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mt-3">
              Want Personal Mentorship & Live Classes?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-blue-100">
              Join Gnosis Kaksha for offline and hybrid coaching with specialized faculty, regular tests, doubt-clearing sessions, and guaranteed academic improvement.
            </p>
          </div>
          <div className="shrink-0">
            <Link
              href="/admission"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-[#1A2B4A] shadow-lg hover:bg-blue-50 transition active:scale-95"
            >
              Apply for Admission <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Material Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F8FAFC]">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1295D8]">
                  Class {previewMaterial.classNumber} · {previewMaterial.subject} · {previewMaterial.category}
                </span>
                <h3 className="text-lg font-bold text-[#1A2B4A] mt-0.5">
                  {previewMaterial.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMaterial(null)}
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Document Preview */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Document Overview
                </p>
                <p className="text-sm text-gray-700">{previewMaterial.description}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>Author: <b>{previewMaterial.uploadedBy}</b></span>
                  <span>Size: <b>{previewMaterial.fileSize}</b></span>
                  <span>Format: <b>{previewMaterial.fileType}</b></span>
                  <span>Date: <b>{formatDate(previewMaterial.createdAt)}</b></span>
                </div>
              </div>

              {/* Sample Document Page Simulation */}
              <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center bg-[#FBFDFE]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-[#1295D8] mb-3">
                  <FileText size={28} />
                </div>
                <h4 className="text-base font-bold text-[#1A2B4A]">
                  {previewMaterial.fileType} Ready for Offline Reading
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  This study material is verified by Gnosis Kaksha academic faculty. Sign in and click Download below to save the file to your device.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-[#F8FAFC]">
              <span className="text-xs text-gray-500">
                📥 {previewMaterial.downloads} students downloaded this
              </span>
              <div className="flex items-center gap-2">
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
                  <Download size={15} /> {user ? 'Download' : 'Sign in to download'} ({previewMaterial.fileSize})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
