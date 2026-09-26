'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  CalendarCheck,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  AlertTriangle,
  WifiOff,
  Wifi,
  Sparkles,
  Printer,
  RotateCcw,
  Check,
  UserCheck,
  FileSpreadsheet,
  BookOpen,
} from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/Button';
import { getAllStudents, type RosterStudent } from '@/lib/institute-store';
import {
  getAttendanceRecord,
  saveAttendanceRecord,
  type AttendanceRecord,
  type AttendanceStatus,
  type AttendanceEntry,
} from '@/lib/attendance-store';
import { useAuth } from '@/hooks/useAuth';

export default function TeacherAttendancePage() {
  const { user } = useAuth();

  // Date state (defaults to today in YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedClass, setSelectedClass] = useState<number>(10);
  const [selectedSubject, setSelectedSubject] = useState<string>('Science');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Machine status state: 'offline' (switched off/unavailable) or 'online'
  const [machineStatus, setMachineStatus] = useState<'offline' | 'online'>('offline');
  const [isManualOverride, setIsManualOverride] = useState<boolean>(true);

  // Student attendance entry map: { [studentId]: { status: AttendanceStatus, remark: string } }
  const [entries, setEntries] = useState<Record<string, { status: AttendanceStatus; remark: string }>>({});
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Fetch active students
  const allActiveStudents = useMemo(() => {
    return getAllStudents().filter((s) => s.status === 'active');
  }, []);

  // Available classes in institute
  const availableClasses = useMemo(() => {
    const set = new Set(allActiveStudents.map((s) => s.classNumber));
    return Array.from(set).sort((a, b) => a - b);
  }, [allActiveStudents]);

  // Subjects available for the selected class
  const availableSubjectsForClass = useMemo(() => {
    const set = new Set<string>();
    allActiveStudents
      .filter((s) => s.classNumber === selectedClass)
      .forEach((s) => s.subjects.forEach((sub) => set.add(sub)));
    return Array.from(set).sort();
  }, [allActiveStudents, selectedClass]);

  // Auto-select first available subject if current selection is not in list
  useEffect(() => {
    if (availableSubjectsForClass.length > 0 && !availableSubjectsForClass.includes(selectedSubject)) {
      setSelectedSubject(availableSubjectsForClass[0]);
    }
  }, [availableSubjectsForClass, selectedSubject]);

  // Students enrolled in the selected class and subject
  const enrolledStudents = useMemo(() => {
    return allActiveStudents.filter(
      (s) => s.classNumber === selectedClass && s.subjects.includes(selectedSubject)
    );
  }, [allActiveStudents, selectedClass, selectedSubject]);

  // Filtered enrolled students for search
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return enrolledStudents;
    const q = searchTerm.toLowerCase();
    return enrolledStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.registrationNumber.toLowerCase().includes(q)
    );
  }, [enrolledStudents, searchTerm]);

  // Load existing attendance record whenever Date, Class, or Subject changes
  useEffect(() => {
    setIsSaved(false);
    const existing = getAttendanceRecord(selectedDate, selectedClass, selectedSubject);
    if (existing && existing.entries.length > 0) {
      const map: Record<string, { status: AttendanceStatus; remark: string }> = {};
      existing.entries.forEach((e) => {
        map[e.studentId] = { status: e.status, remark: e.remark || '' };
      });
      setEntries(map);
      setLastSavedTime(existing.savedAt);
    } else {
      // Default initialization: all enrolled students unmarked or default present
      const initialMap: Record<string, { status: AttendanceStatus; remark: string }> = {};
      enrolledStudents.forEach((s) => {
        initialMap[s.id] = { status: 'present', remark: '' };
      });
      setEntries(initialMap);
      setLastSavedTime(null);
    }
  }, [selectedDate, selectedClass, selectedSubject, enrolledStudents]);

  // Attendance metrics
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    enrolledStudents.forEach((s) => {
      const entry = entries[s.id];
      if (entry?.status === 'present') present++;
      else if (entry?.status === 'absent') absent++;
      else if (entry?.status === 'late') late++;
    });
    const total = enrolledStudents.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, percentage };
  }, [enrolledStudents, entries]);

  // Handle individual status change
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setEntries((prev) => ({
      ...prev,
      [studentId]: {
        status,
        remark: prev[studentId]?.remark || '',
      },
    }));
    setIsSaved(false);
  };

  // Handle individual remark change
  const handleRemarkChange = (studentId: string, remark: string) => {
    setEntries((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'present',
        remark,
      },
    }));
    setIsSaved(false);
  };

  // Bulk actions
  const markAll = (status: AttendanceStatus) => {
    const updated: Record<string, { status: AttendanceStatus; remark: string }> = {};
    enrolledStudents.forEach((s) => {
      updated[s.id] = {
        status,
        remark: entries[s.id]?.remark || '',
      };
    });
    setEntries(updated);
    setIsSaved(false);
  };

  // Save attendance
  const handleSave = () => {
    const entryList: AttendanceEntry[] = enrolledStudents.map((s) => ({
      studentId: s.id,
      studentName: s.fullName,
      registrationNumber: s.registrationNumber,
      status: entries[s.id]?.status || 'present',
      remark: entries[s.id]?.remark || undefined,
    }));

    const record: AttendanceRecord = {
      id: `att-${selectedDate}-cls${selectedClass}-${selectedSubject.toLowerCase().replace(/\s+/g, '-')}`,
      date: selectedDate,
      classNumber: selectedClass,
      subject: selectedSubject,
      teacherName: user?.fullName || 'Faculty Teacher',
      mode: machineStatus === 'offline' || isManualOverride ? 'manual' : 'biometric',
      entries: entryList,
      totalStudents: stats.total,
      presentCount: stats.present,
      absentCount: stats.absent,
      lateCount: stats.late,
      savedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    };

    saveAttendanceRecord(record);
    setIsSaved(true);
    setLastSavedTime(record.savedAt);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">

      {/* ── Page Header (Hidden on Print) ── */}
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold text-[#1A2B4A]">Subject Attendance</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <CalendarCheck size={13} /> Daily Roster
            </span>
          </div>
          <p className="mt-1 text-sm text-[#4A5568]">
            Mark lecture attendance for enrolled students. When biometric machine is unavailable or switched off, use manual mode.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrint}
            className="gap-1.5 border-gray-300"
          >
            <Printer size={15} /> Print Attendance Sheet
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            className="gap-2 bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] text-white shadow-sm hover:shadow"
          >
            <Save size={16} /> Save Attendance
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MACHINE STATUS / OFFLINE FALLBACK BANNER
          ══════════════════════════════════════════════════════════ */}
      <div
        className={`rounded-2xl border p-4 transition-all duration-200 print:hidden ${
          machineStatus === 'offline' || isManualOverride
            ? 'border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 shadow-xs'
            : 'border-emerald-200 bg-emerald-50/70'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-xl p-2.5 shrink-0 ${
                machineStatus === 'offline' || isManualOverride
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-emerald-600 text-white shadow-xs'
              }`}
            >
              {machineStatus === 'offline' || isManualOverride ? <WifiOff size={20} /> : <Wifi size={20} />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1A2B4A]">
                  {machineStatus === 'offline' || isManualOverride
                    ? 'Biometric Machine Unavailable / Switched Off — Manual Mode Active'
                    : 'Biometric Attendance Machine Online & Connected'}
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    machineStatus === 'offline' || isManualOverride
                      ? 'bg-amber-200/80 text-amber-900 border border-amber-300'
                      : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  {machineStatus === 'offline' ? 'Machine Switched Off' : 'Machine Online'}
                </span>
              </div>

              <p className="mt-1 text-xs text-[#4A5568] leading-relaxed">
                {machineStatus === 'offline' || isManualOverride
                  ? 'The automated biometric scanner is currently switched off or undergoing maintenance. Faculty can mark student attendance manually below.'
                  : 'Attendance can be recorded automatically via RFID / Biometric scanner, or overridden manually by the teacher.'}
              </p>
            </div>
          </div>

          {/* Machine Status Switcher & Manual Toggle */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setMachineStatus((prev) => (prev === 'offline' ? 'online' : 'offline'));
                setIsManualOverride(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors"
            >
              Toggle Machine: {machineStatus === 'offline' ? 'Turn Online' : 'Turn Offline'}
            </button>

            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold shadow-2xs">
              <Check size={14} /> Manual Enabled
            </span>
          </div>
        </div>
      </div>

      {/* ── Selection Control Bar (Class, Subject, Date) ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs print:border-none print:p-0">
        {/* Date Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
            Attendance Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0F172A] bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1295D8]"
          />
        </div>

        {/* Class Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
            Select Class
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0F172A] bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1295D8]"
          >
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                Class {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Subject Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
            Select Subject
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0F172A] bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1295D8]"
          >
            {availableSubjectsForClass.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        {/* Student Search */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
            Filter Roster
          </label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search student or reg no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0F172A] bg-white placeholder:text-slate-400 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1295D8]"
            />
          </div>
        </div>
      </div>

      {/* ── Attendance Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Enrolled */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Enrolled in {selectedSubject}
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-[#1A2B4A]">{stats.total}</p>
            <span className="text-xs font-semibold text-slate-600">Class {selectedClass}</span>
          </div>
        </div>

        {/* Present */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Present Students
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-emerald-700">{stats.present}</p>
            <span className="text-xs font-bold text-emerald-700">{stats.percentage}% Rate</span>
          </div>
        </div>

        {/* Absent */}
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-red-800">
            Absent Students
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-red-600">{stats.absent}</p>
            <span className="text-xs font-bold text-red-700">
              {stats.total > 0 ? Math.round((stats.absent / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Late */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
            Late Arrivals
          </p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-2xl font-black text-amber-600">{stats.late}</p>
            <span className="text-xs font-bold text-amber-700">Late Marked</span>
          </div>
        </div>
      </div>

      {/* ── Saved Status Banner ── */}
      {isSaved && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5 flex items-center justify-between text-emerald-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>
              Attendance for <strong>Class {selectedClass} — {selectedSubject}</strong> on <strong>{selectedDate}</strong> successfully saved to records.
            </span>
          </div>
          {lastSavedTime && <span className="text-emerald-700 text-[11px]">Saved at {lastSavedTime}</span>}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STUDENT ATTENDANCE ROSTER TABLE
          ══════════════════════════════════════════════════════════ */}
      {enrolledStudents.length === 0 ? (
        <EmptyState
          icon={Users}
          title={`No students enrolled in ${selectedSubject}`}
          message={`There are currently no active students taking ${selectedSubject} in Class ${selectedClass}.`}
        />
      ) : (
        <SectionCard
          title={`Enrolled Students — ${selectedSubject} (Class ${selectedClass})`}
          description={`Showing ${filteredStudents.length} of ${enrolledStudents.length} students enrolled in ${selectedSubject}`}
          action={
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <span className="text-xs font-bold text-gray-500 uppercase mr-1">Quick Bulk:</span>
              <button
                type="button"
                onClick={() => markAll('present')}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <CheckCircle2 size={13} /> Mark All Present
              </button>
              <button
                type="button"
                onClick={() => markAll('absent')}
                className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 transition-colors"
              >
                <XCircle size={13} /> Mark All Absent
              </button>
              <button
                type="button"
                onClick={() => markAll('late')}
                className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
              >
                <Clock size={13} /> Mark All Late
              </button>
            </div>
          }
          bodyClassName="p-0"
        >
          {/* Printable Header Details (Visible ONLY on print) */}
          <div className="hidden print:block p-4 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-[#1A2B4A]">GNOSIS KAKSHA • ATTENDANCE SHEET</h2>
                <p className="text-xs text-gray-600">
                  Class: Class {selectedClass} | Subject: {selectedSubject} | Date: {selectedDate}
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold">Faculty: {user?.fullName || 'Subject Teacher'}</p>
                <p className="text-gray-500">Mode: Manual Fallback Record</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-[#718096] bg-[#F8FAFC]">
                  <th className="px-5 py-3.5 w-12 text-center">#</th>
                  <th className="px-5 py-3.5">Student Details</th>
                  <th className="px-5 py-3.5">Board / Stream</th>
                  <th className="px-5 py-3.5 text-center">Manual Attendance Status</th>
                  <th className="px-5 py-3.5">Remark / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((s, idx) => {
                  const currentStatus = entries[s.id]?.status || 'present';
                  const currentRemark = entries[s.id]?.remark || '';

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-[#F7FAFC] transition-colors ${
                        currentStatus === 'absent'
                          ? 'bg-red-50/20'
                          : currentStatus === 'late'
                          ? 'bg-amber-50/20'
                          : ''
                      }`}
                    >
                      {/* Roll / Index */}
                      <td className="px-5 py-4 text-center font-bold text-slate-400 text-xs">
                        {idx + 1}
                      </td>

                      {/* Student info */}
                      <td className="px-5 py-4">
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

                      {/* Board */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-xs font-medium text-[#1A2B4A]">{s.board} Board</p>
                        <p className="text-[11px] text-slate-500">{s.stream || 'General Course'}</p>
                      </td>

                      {/* Attendance Toggle Buttons */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-2xs gap-1">
                          {/* Present Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'present')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            <CheckCircle2 size={14} /> Present
                          </button>

                          {/* Absent Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'absent')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === 'absent'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-red-50 hover:text-red-700'
                            }`}
                          >
                            <XCircle size={14} /> Absent
                          </button>

                          {/* Late Button */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, 'late')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === 'late'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
                            }`}
                          >
                            <Clock size={14} /> Late
                          </button>
                        </div>
                      </td>

                      {/* Remarks Input */}
                      <td className="px-5 py-4">
                        <input
                          type="text"
                          placeholder="Add remark (optional)..."
                          value={currentRemark}
                          onChange={(e) => handleRemarkChange(s.id, e.target.value)}
                          className="w-full max-w-xs px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs text-[#0F172A] bg-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#1295D8]"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Table Bar with Save */}
          <div className="border-t border-gray-100 bg-[#F8FAFC] px-6 py-4 flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
              <span>
                Total: <strong>{stats.total}</strong>
              </span>
              <span>
                Present: <strong className="text-emerald-700">{stats.present}</strong>
              </span>
              <span>
                Absent: <strong className="text-red-600">{stats.absent}</strong>
              </span>
              <span>
                Late: <strong className="text-amber-600">{stats.late}</strong>
              </span>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              className="gap-2 bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] text-white shadow-sm hover:shadow"
            >
              <Save size={16} /> Save Attendance Record
            </Button>
          </div>
        </SectionCard>
      )}

      {/* Global Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          nav, header, aside, footer, .print\\:hidden, button {
            display: none !important;
          }
          body {
            background: #ffffff !important;
          }
        }
      `}</style>
    </div>
  );
}
