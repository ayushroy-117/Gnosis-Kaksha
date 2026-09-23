'use client';

import { useState, useMemo } from 'react';
import { Users, Search, BookOpen, GraduationCap, Phone, UserCheck } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { getAllStudents } from '@/lib/institute-store';
import { classLabel } from '@/lib/institute-data';

export default function TeacherStudentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const students = useMemo(() => {
    return getAllStudents().filter((s) => s.status === 'active');
  }, []);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.subjects.some((sub) => sub.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesClass =
        selectedClass === 'all' || String(s.classNumber) === selectedClass;

      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClass]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [filtered]);

  const availableClasses = useMemo(() => {
    const set = new Set(students.map((s) => s.classNumber));
    return Array.from(set).sort((a, b) => a - b);
  }, [students]);

  return (
    <div className="space-y-6">
      <SampleDataBanner />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Student Directory</h1>
          <p className="mt-1 text-[#4A5568]">
            Academic student roster, enrolled subjects, and guardian contact details for batch teachers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-[#1295D8] border border-blue-200">
            <Users size={14} /> Total Active: {students.length}
          </span>
        </div>
      </div>

      {/* Search and Class Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, registration no., or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-[#0F172A] bg-white placeholder:text-slate-500 font-medium focus:outline-hidden focus:ring-2 focus:ring-[#1295D8]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600 uppercase">Class:</label>
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
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students found"
          message={
            searchTerm || selectedClass !== 'all'
              ? 'No students match your search or filter criteria.'
              : 'Active students will appear here once admissions are approved.'
          }
        />
      ) : (
        <SectionCard
          title={`Enrolled Students (${sorted.length})`}
          description="Academic information, class enrollment, and subject list"
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-[#718096] bg-[#F8FAFC]">
                  <th className="px-6 py-3.5">Student</th>
                  <th className="px-6 py-3.5">Class &amp; Board</th>
                  <th className="px-6 py-3.5">Enrolled Subjects</th>
                  <th className="px-6 py-3.5">Guardian &amp; Contact</th>
                  <th className="px-6 py-3.5 text-right">Academic Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F7FAFC] transition-colors">
                    {/* Student name & avatar */}
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

                    {/* Enrolled subjects pills */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-sm">
                        {s.subjects.map((sub) => (
                          <span
                            key={sub}
                            className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-[#1295D8] ring-1 ring-inset ring-blue-200/60"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Guardian & Contact (confidential academic contact) */}
                    <td className="px-6 py-4">
                      <p className="text-xs font-semibold text-[#1A2B4A]">
                        {s.parentName || 'Guardian'}
                      </p>
                      <p className="text-xs text-[#718096] flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="text-gray-400" /> +91 {s.mobile}
                      </p>
                    </td>

                    {/* Academic Status */}
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                        <UserCheck size={13} /> Active Enrolled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
