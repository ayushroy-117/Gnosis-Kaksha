'use client';

import { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Printer,
} from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { canTeach, type TeacherData } from '@/lib/institute-data';
import type { AttendanceRecord, AttendanceStatus, AttendanceEntry } from '@/lib/attendance-store';
import { useAuth } from '@/hooks/useAuth';
import { useApi, apiFetch } from '@/hooks/useApi';
import toast from 'react-hot-toast';

type EntryMap = Record<string, { status: AttendanceStatus; remark: string }>;

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function TeacherAttendancePage() {
  const { user: authUser } = useAuth();
  // /api/auth/me returns branchId/branchName (see getSessionUser); widen until UserData declares them.
  const user = authUser;

  // Date state (defaults to today, YYYY-MM-DD in UTC — matches the server's future-date check)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [chosenClass, setChosenClass] = useState<number | null>(null);
  const [chosenSubject, setChosenSubject] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const { data, error, loading, reload } = useApi<TeacherData>('/api/data/teacher');

  // Branch: teachers (and any branch-bound staff) are fixed to their own branch;
  // staff who see every branch (admin) must pick one — records are per branch.
  const isTeacher = user?.role === 'teacher';
  const needsBranchChoice = !!user && !isTeacher && !user.branchId;
  const branchesApi = useApi<{ branches: { id: string; name: string }[] }>(needsBranchChoice ? '/api/branches' : null);
  const branches = useMemo(() => branchesApi.data?.branches ?? [], [branchesApi.data]);
  const [chosenBranch, setChosenBranch] = useState<string>('');
  const selectedBranchId = needsBranchChoice
    ? branches.some((b) => b.id === chosenBranch)
      ? chosenBranch
      : branches.length === 1
      ? branches[0].id
      : ''
    : '';
  const selectedBranchName = needsBranchChoice
    ? branches.find((b) => b.id === selectedBranchId)?.name ?? ''
    : user?.branchName ?? '';

  // Active students (of the selected branch, when choosing one)
  const allActiveStudents = useMemo(() => {
    return (data?.roster ?? []).filter(
      (s) => s.status === 'active' && (!needsBranchChoice || (!!selectedBranchId && s.branchId === selectedBranchId))
    );
  }, [data, needsBranchChoice, selectedBranchId]);

  // Classes that have students in a subject this teacher teaches
  const scope = data?.assignments ?? null;
  const availableClasses = useMemo(() => {
    const set = new Set(
      allActiveStudents
        .filter((s) => s.subjects.some((sub) => canTeach(scope, sub, s.classNumber)))
        .map((s) => s.classNumber)
    );
    return Array.from(set).sort((a, b) => a - b);
  }, [allActiveStudents, scope]);

  const selectedClass =
    chosenClass !== null && availableClasses.includes(chosenClass) ? chosenClass : availableClasses[0] ?? null;

  // Subjects available for the selected class
  const availableSubjectsForClass = useMemo(() => {
    const set = new Set<string>();
    allActiveStudents
      .filter((s) => s.classNumber === selectedClass)
      .forEach((s) => s.subjects.forEach((sub) => selectedClass !== null && canTeach(scope, sub, selectedClass) && set.add(sub)));
    return Array.from(set).sort();
  }, [allActiveStudents, selectedClass, scope]);

  const selectedSubject =
    chosenSubject && availableSubjectsForClass.includes(chosenSubject)
      ? chosenSubject
      : availableSubjectsForClass[0] ?? '';

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

  // Existing record for the selected Date / Class / Subject (re-fetched when the selection changes)
  const recordUrl =
    selectedClass !== null && selectedSubject
      ? `/api/attendance?${new URLSearchParams({
          date: selectedDate,
          classNumber: String(selectedClass),
          subject: selectedSubject,
          ...(needsBranchChoice ? { branchId: selectedBranchId } : {}),
        }).toString()}`
      : null;
  const {
    data: recordData,
    error: recordError,
    loading: recordLoading,
    reload: reloadRecord,
    setData: setRecordData,
  } = useApi<{ records: AttendanceRecord[] }>(recordUrl);
  // useApi keeps the previous response while a new selection loads, so match it to the selection.
  const existingRecord =
    recordData?.records.find(
      (r) =>
        r.date === selectedDate &&
        r.classNumber === selectedClass &&
        r.subject.toLowerCase() === selectedSubject.toLowerCase() &&
        (!needsBranchChoice || r.branchId === selectedBranchId)
    ) ?? null;

  // Entries from the saved record, or everyone present by default
  const baseEntries = useMemo<EntryMap>(() => {
    const map: EntryMap = {};
    enrolledStudents.forEach((s) => {
      map[s.id] = { status: 'present', remark: '' };
    });
    existingRecord?.entries.forEach((e) => {
      map[e.studentId] = { status: e.status, remark: e.remark || '' };
    });
    return map;
  }, [enrolledStudents, existingRecord]);

  // Unsaved edits are tied to the current selection + saved version; changing either discards them.
  const selectionKey = `${selectedBranchId}|${selectedDate}|${selectedClass}|${selectedSubject}|${existingRecord?.savedAt ?? 'new'}`;
  const [draft, setDraft] = useState<{ key: string; map: EntryMap } | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const isDirty = draft?.key === selectionKey;
  const entries = isDirty ? draft.map : baseEntries;
  const isSaved = savedKey === selectionKey && !isDirty;
  const lastSavedTime = existingRecord ? formatSavedAt(existingRecord.savedAt) : null;

  const updateEntries = (fn: (prev: EntryMap) => EntryMap) => {
    setDraft({ key: selectionKey, map: fn(entries) });
  };

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
    updateEntries((prev) => ({
      ...prev,
      [studentId]: {
        status,
        remark: prev[studentId]?.remark || '',
      },
    }));
  };

  // Handle individual remark change
  const handleRemarkChange = (studentId: string, remark: string) => {
    updateEntries((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'present',
        remark,
      },
    }));
  };

  // Bulk actions
  const markAll = (status: AttendanceStatus) => {
    updateEntries((prev) => {
      const updated: EntryMap = {};
      enrolledStudents.forEach((s) => {
        updated[s.id] = { status, remark: prev[s.id]?.remark || '' };
      });
      return updated;
    });
  };

  // Save attendance
  const handleSave = async () => {
    if (needsBranchChoice && !selectedBranchId) {
      toast.error('Select a branch first.');
      return;
    }
    if (selectedClass === null || !selectedSubject || enrolledStudents.length === 0) {
      toast.error('Select a class and subject with enrolled students first.');
      return;
    }
    const entryList: AttendanceEntry[] = enrolledStudents.map((s) => ({
      studentId: s.id,
      studentName: s.fullName,
      registrationNumber: s.registrationNumber,
      status: entries[s.id]?.status || 'present',
      remark: entries[s.id]?.remark.trim() || undefined,
    }));

    setIsSaving(true);
    try {
      const { record } = await apiFetch<{ record: AttendanceRecord }>('/api/attendance', {
        method: 'POST',
        json: {
          date: selectedDate,
          classNumber: selectedClass,
          subject: selectedSubject,
          mode: 'manual',
          entries: entryList,
          ...(needsBranchChoice ? { branchId: selectedBranchId } : {}),
        },
      });
      setRecordData({ records: [record] });
      setDraft(null);
      setSavedKey(`${selectedBranchId}|${selectedDate}|${selectedClass}|${selectedSubject}|${record.savedAt}`);
      toast.success(`Attendance saved for Class ${selectedClass} — ${selectedSubject}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save attendance.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) return <LoadingState label="Loading roster…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load roster.'} onRetry={reload} />;

  const canSave = enrolledStudents.length > 0 && !recordLoading && !recordError;

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
          {!needsBranchChoice && selectedBranchName && (
            <p className="mt-1 text-sm font-semibold text-[#2E5EAA]">Branch: {selectedBranchName}</p>
          )}
          <p className="mt-1 text-sm text-[#4A5568]">
            Mark lecture attendance for enrolled students. Records are saved to the institute database and can be re-opened and corrected for any past date.
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
            isLoading={isSaving}
            disabled={!canSave}
            className="gap-2 bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] text-white shadow-sm hover:shadow"
          >
            <Save size={16} /> Save Attendance
          </Button>
        </div>
      </div>

      {/* ── Selection Control Bar (Class, Subject, Date) ── */}
      <div
        className={`grid grid-cols-1 gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs print:border-none print:p-0 ${
          needsBranchChoice ? 'md:grid-cols-5' : 'md:grid-cols-4'
        }`}
      >
        {/* Branch Selector (staff who see every branch) */}
        {needsBranchChoice && (
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
              Branch <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedBranchId}
              onChange={(e) => setChosenBranch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0F172A] bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1295D8]"
            >
              <option value="" disabled>
                {branchesApi.loading ? 'Loading branches…' : 'Select a branch'}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {branchesApi.error && (
              <p className="mt-1 text-xs text-red-600">{branchesApi.error.message}</p>
            )}
          </div>
        )}

        {/* Date Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
            Attendance Date
          </label>
          <input
            type="date"
            value={selectedDate}
            max={todayStr}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0F172A] bg-white font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1295D8]"
          />
        </div>

        {/* Class Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
            Select Class
          </label>
          <select
            value={selectedClass ?? ''}
            onChange={(e) => setChosenClass(Number(e.target.value))}
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
            onChange={(e) => setChosenSubject(e.target.value)}
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
          {lastSavedTime && <span className="text-emerald-700 text-[11px]">Saved {lastSavedTime}</span>}
        </div>
      )}

      {/* ── Existing record notice ── */}
      {!isSaved && existingRecord && !recordLoading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 flex flex-wrap items-center justify-between gap-2 text-[#1E3A8A] text-xs font-semibold print:hidden">
          <span>
            Showing the saved record for this lecture{existingRecord.teacherName ? ` (by ${existingRecord.teacherName})` : ''}
            {isDirty ? ' — you have unsaved changes.' : '. Saving again will overwrite it.'}
          </span>
          {lastSavedTime && <span className="text-[11px]">Last saved {lastSavedTime}</span>}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STUDENT ATTENDANCE ROSTER TABLE
          ══════════════════════════════════════════════════════════ */}
      {needsBranchChoice && !selectedBranchId ? (
        <EmptyState
          icon={Users}
          title="Select a branch"
          message="Choose a branch to load its students and attendance records."
        />
      ) : availableClasses.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No active students"
          message="Attendance can be marked once students are enrolled."
        />
      ) : recordError ? (
        <ErrorState message={recordError.message} onRetry={reloadRecord} />
      ) : recordLoading ? (
        <LoadingState label="Loading attendance record…" />
      ) : enrolledStudents.length === 0 ? (
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
                  {selectedBranchName ? `Branch: ${selectedBranchName} | ` : ''}Class: Class {selectedClass} | Subject: {selectedSubject} | Date: {selectedDate}
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold">Faculty: {user?.fullName || 'Subject Teacher'}</p>
                <p className="text-gray-500">Mode: Manual</p>
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
              isLoading={isSaving}
              disabled={!canSave}
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
