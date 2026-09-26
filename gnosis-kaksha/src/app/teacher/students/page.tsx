'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  BookOpen,
  Phone,
  UserCheck,
  QrCode,
  Barcode as BarcodeIcon,
  LayoutGrid,
  List,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Barcode } from '@/components/ui/Barcode';
import { getAllStudents, type RosterStudent } from '@/lib/institute-store';
import { classLabel } from '@/lib/institute-data';
import { QRCodeSVG } from 'qrcode.react';

export default function TeacherStudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [activeBarcodeStudent, setActiveBarcodeStudent] = useState<RosterStudent | null>(null);
  const [copiedRegNo, setCopiedRegNo] = useState(false);

  // Active enrolled students
  const students = useMemo(() => {
    return getAllStudents().filter((s) => s.status === 'active');
  }, []);

  // Unique classes and subjects for filter dropdowns
  const availableClasses = useMemo(() => {
    const set = new Set(students.map((s) => s.classNumber));
    return Array.from(set).sort((a, b) => a - b);
  }, [students]);

  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.subjects.forEach((sub) => set.add(sub)));
    return Array.from(set).sort();
  }, [students]);

  // Filtered students
  const filtered = useMemo(() => {
    return students.filter((s) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        s.fullName.toLowerCase().includes(q) ||
        s.registrationNumber.toLowerCase().includes(q) ||
        s.subjects.some((sub) => sub.toLowerCase().includes(q)) ||
        (s.parentName && s.parentName.toLowerCase().includes(q));

      const matchesClass =
        selectedClass === 'all' || String(s.classNumber) === selectedClass;

      const matchesSubject =
        selectedSubject === 'all' || s.subjects.includes(selectedSubject);

      return matchesSearch && matchesClass && matchesSubject;
    });
  }, [students, searchTerm, selectedClass, selectedSubject]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [filtered]);

  const handleCopyReg = (regNo: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(regNo);
      setCopiedRegNo(true);
      setTimeout(() => setCopiedRegNo(false), 2000);
    }
  };

  const handlePrintModalBarcode = () => {
    window.print();
  };

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-[#1A2B4A]">Student Roster &amp; ID Directory</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#1295D8] border border-blue-200">
              <Sparkles size={12} /> Barcode Enabled
            </span>
          </div>
          <p className="mt-1 text-sm text-[#4A5568]">
            Academic student roster, enrolled subjects, barcode identification, and guardian contacts for faculty.
          </p>
        </div>

        {/* Quick Stats Banner */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-1.5 text-xs font-bold text-[#1295D8] flex items-center gap-1.5 shadow-2xs">
            <Users size={15} /> Total Active: {students.length}
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            {availableClasses.length} Classes
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            {availableSubjects.length} Subjects
          </div>
        </div>
      </div>

      {/* ── Search, Filters, and View Switcher ── */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, registration no., or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-[#0F172A] bg-white placeholder:text-slate-400 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1295D8]"
          />
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Class:</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0F172A] bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1295D8]"
          >
            <option value="all">All Classes</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={String(cls)}>
                Class {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Filter */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Subject:</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0F172A] bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1295D8]"
          >
            <option value="all">All Subjects</option>
            {availableSubjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Switcher */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            title="Grid Cards View"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-[#1295D8] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            title="Table List View"
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-[#1295D8] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* ── Content View ── */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          message={
            searchTerm || selectedClass !== 'all' || selectedSubject !== 'all'
              ? 'No students match your filter criteria. Try clearing filters.'
              : 'Enrolled students will appear here once admissions are active.'
          }
        />
      ) : viewMode === 'grid' ? (
        /* ══════════════════════════════════════════════════════════
           GRID / CARD VIEW (Interactive ID Badges with Barcode)
           ══════════════════════════════════════════════════════════ */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sorted.map((s) => (
            <div
              key={s.id}
              className="group rounded-2xl border border-gray-200 bg-white shadow-xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between overflow-hidden"
            >
              {/* Card Top: Gradient Banner & Avatar */}
              <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#1E3A8A] px-5 py-3 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-300 bg-white/10 px-2 py-0.5 rounded">
                    {s.registrationNumber}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200">
                  Class {s.classNumber} • {s.board}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-[#CDE6F7] text-[#1E3A8A] flex items-center justify-center font-black text-lg border border-blue-200 shadow-2xs">
                    {s.fullName.charAt(0)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1A2B4A] text-base leading-tight truncate">
                      {s.fullName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      Guardian: <span className="font-medium text-gray-700">{s.parentName || 'Parent'}</span>
                    </p>
                    <p className="text-xs text-[#718096] flex items-center gap-1 mt-0.5">
                      <Phone size={12} className="text-[#1295D8]" /> +91 {s.mobile}
                    </p>
                  </div>
                </div>

                {/* Enrolled Subjects */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                    <BookOpen size={11} /> Enrolled Subjects ({s.subjects.length})
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {s.subjects.map((sub) => (
                      <span
                        key={sub}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          selectedSubject === sub
                            ? 'bg-[#1295D8] text-white font-bold'
                            : 'bg-blue-50 text-[#1295D8] ring-1 ring-inset ring-blue-200/70'
                        }`}
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Inline Barcode Preview Strip */}
                <div
                  onClick={() => setActiveBarcodeStudent(s)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 flex flex-col items-center justify-center hover:bg-blue-50/50 hover:border-[#1295D8] transition-colors"
                  title="Click to view & scan full barcode"
                >
                  <Barcode value={s.registrationNumber} width={180} height={28} showValue={false} />
                  <span className="font-mono text-[9px] font-bold tracking-widest text-slate-700 mt-1">
                    * {s.registrationNumber} *
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="border-t border-gray-100 bg-[#F8FAFC] px-5 py-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <UserCheck size={13} /> Active Enrolled
                </span>

                <button
                  type="button"
                  onClick={() => setActiveBarcodeStudent(s)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#1E3A8A] hover:bg-[#1295D8] hover:text-white hover:border-[#1295D8] shadow-2xs transition-all"
                >
                  <BarcodeIcon size={14} /> Scan Barcode
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ══════════════════════════════════════════════════════════
           TABLE VIEW (Enhanced with Inline Barcode & Scan Trigger)
           ══════════════════════════════════════════════════════════ */
        <SectionCard
          title={`Enrolled Students Directory (${sorted.length})`}
          description="Academic information, class enrollment, and student barcode"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-[#718096] bg-[#F8FAFC]">
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Class &amp; Board</th>
                  <th className="px-6 py-3.5">Enrolled Subjects</th>
                  <th className="px-6 py-3.5">Guardian &amp; Mobile</th>
                  <th className="px-6 py-3.5 text-center">Barcode ID</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F7FAFC] transition-colors">
                    {/* Student Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7] text-xs font-bold text-[#2E5EAA]">
                          {s.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1A2B4A]">{s.fullName}</p>
                          <p className="font-mono text-xs text-[#1295D8]">{s.registrationNumber}</p>
                        </div>
                      </div>
                    </td>

                    {/* Class & Board */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-[#1A2B4A]">{classLabel(s)}</p>
                      <p className="text-xs text-[#718096]">{s.board} Board</p>
                    </td>

                    {/* Enrolled Subjects */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {s.subjects.map((sub) => (
                          <span
                            key={sub}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              selectedSubject === sub
                                ? 'bg-[#1295D8] text-white font-bold'
                                : 'bg-blue-50 text-[#1295D8] ring-1 ring-inset ring-blue-200/60'
                            }`}
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Guardian & Contact */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-xs font-semibold text-[#1A2B4A]">
                        {s.parentName || 'Guardian'}
                      </p>
                      <p className="text-xs text-[#718096] flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="text-gray-400" /> +91 {s.mobile}
                      </p>
                    </td>

                    {/* Barcode Strip */}
                    <td className="px-6 py-4 text-center">
                      <div
                        onClick={() => setActiveBarcodeStudent(s)}
                        className="cursor-pointer inline-flex flex-col items-center bg-slate-50 border border-slate-200 hover:border-[#1295D8] rounded-lg px-2.5 py-1 transition-colors"
                        title="Click to expand barcode"
                      >
                        <Barcode value={s.registrationNumber} width={120} height={20} showValue={false} />
                        <span className="font-mono text-[8px] text-slate-600 font-bold">
                          {s.registrationNumber}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setActiveBarcodeStudent(s)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#1E3A8A] hover:bg-[#1295D8] hover:text-white transition-all shadow-2xs"
                      >
                        <BarcodeIcon size={14} /> Scan
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ══════════════════════════════════════════════════════════
          STUDENT BARCODE SCAN MODAL
          ══════════════════════════════════════════════════════════ */}
      {activeBarcodeStudent && (
        <Modal
          isOpen={!!activeBarcodeStudent}
          onClose={() => setActiveBarcodeStudent(null)}
          title="Student Identity & Barcode"
          size="md"
        >
          <div className="space-y-5" id="printable-single-barcode">
            {/* Student Header */}
            <div className="flex items-center gap-3.5 bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] text-white p-4 rounded-xl">
              <div className="h-12 w-12 shrink-0 rounded-xl bg-white text-[#1E3A8A] flex items-center justify-center font-black text-xl shadow-xs">
                {activeBarcodeStudent.fullName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-base text-white truncate">
                    {activeBarcodeStudent.fullName}
                  </h4>
                  <span className="bg-amber-400 text-[#0F172A] font-black text-[9px] uppercase px-2 py-0.5 rounded">
                    Class {activeBarcodeStudent.classNumber}
                  </span>
                </div>
                <p className="font-mono text-xs font-bold text-sky-200 mt-0.5">
                  {activeBarcodeStudent.registrationNumber}
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Board: {activeBarcodeStudent.board} • Guardian: {activeBarcodeStudent.parentName || 'Parent'} (+91 {activeBarcodeStudent.mobile})
                </p>
              </div>
            </div>

            {/* High-Resolution Scannable Barcode Box */}
            <div className="rounded-xl border-2 border-[#1E3A8A] bg-white p-5 text-center shadow-xs space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#1E3A8A]">
                Official Student Barcode (Code-128 Standard)
              </p>
              <div className="py-2 flex justify-center">
                <Barcode value={activeBarcodeStudent.registrationNumber} width={260} height={48} showValue />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Hold barcode scanner 4–6 inches away or use camera scanner.
              </p>
            </div>

            {/* Dual Verification: QR Code + Quick Info */}
            <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 flex items-center gap-4">
              <div className="rounded-lg border border-slate-300 bg-white p-2 shrink-0 shadow-2xs">
                <QRCodeSVG
                  value={`https://gnosiskaksha.cloud/verify/${activeBarcodeStudent.registrationNumber}`}
                  size={64}
                  level="M"
                  fgColor="#0F172A"
                />
              </div>
              <div className="flex-1 text-xs space-y-1">
                <p className="font-bold text-[#1A2B4A]">Digital Verification QR</p>
                <p className="text-slate-600 text-[11px] leading-tight">
                  Scannable by faculty or staff mobile camera to verify active institutional enrollment.
                </p>
                <div className="pt-1 flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                  <ShieldCheck size={13} /> Active Verified Student • 2026–2027
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleCopyReg(activeBarcodeStudent.registrationNumber)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                {copiedRegNo ? (
                  <>
                    <Check size={14} className="text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} /> Copy Registration No.
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveBarcodeStudent(null)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={handlePrintModalBarcode}
                  className="gap-1.5 bg-[#1295D8] hover:bg-[#2E5EAA] text-white"
                >
                  <Printer size={14} /> Print Badge
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
