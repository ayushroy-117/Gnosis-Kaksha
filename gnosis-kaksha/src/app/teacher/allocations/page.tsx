'use client';

import { useState } from 'react';
import { BookOpen, Plus, X, ClipboardCheck } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  getAllStudents,
  getAllocationRequests,
  createAllocationRequest,
  type SubjectAllocationRequest,
} from '@/lib/institute-store';
import { AVAILABLE_SUBJECTS } from '@/lib/fees';
import { classLabel } from '@/lib/institute-data';
import toast from 'react-hot-toast';

export default function TeacherAllocationsPage() {
  const students = getAllStudents().filter((s) => s.status === 'active');
  const [requests, setRequests] = useState<SubjectAllocationRequest[]>(getAllocationRequests());
  const [showForm, setShowForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const availableSubjects = selectedStudent
    ? (() => {
        const key =
          selectedStudent.stream
            ? `${selectedStudent.classNumber}-${selectedStudent.stream}`
            : `${selectedStudent.classNumber}`;
        const all = AVAILABLE_SUBJECTS[key] || [];
        return all.filter((sub) => !selectedStudent.subjects.includes(sub));
      })()
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedSubject) {
      toast.error('Please select a student and subject.');
      return;
    }
    setIsSubmitting(true);
    try {
      const newReq = createAllocationRequest({
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        registrationNumber: selectedStudent.registrationNumber,
        subject: selectedSubject,
        classNumber: selectedStudent.classNumber,
        requestedBy: 'Ankur Kumar Nath', // In real app, get from auth context
      });
      setRequests((prev) => [newReq, ...prev]);
      toast.success(`Allocation request submitted for ${selectedStudent.fullName} — ${selectedSubject}`);
      setShowForm(false);
      setSelectedStudentId('');
      setSelectedSubject('');
    } catch {
      toast.error('Failed to create allocation request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const resolvedRequests = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="space-y-6">
      <SampleDataBanner />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A2B4A]">Subject Allocations</h1>
          <p className="mt-1 text-[#4A5568]">
            Request additional subject allocations for students. Requests are reviewed by the accountant.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={() => setShowForm(true)}
        >
          <Plus size={16} className="mr-1" />
          New Request
        </Button>
      </div>

      {/* Pending */}
      {pendingRequests.length > 0 && (
        <SectionCard title="Pending Requests" description="Awaiting accountant review" bodyClassName="p-0">
          <ul className="divide-y divide-gray-100">
            {pendingRequests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <ClipboardCheck size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1A2B4A]">{r.studentName} — {r.subject}</p>
                  <p className="text-xs text-[#718096]">
                    {r.registrationNumber} · Class {r.classNumber} · Requested {r.createdAt} by {r.requestedBy}
                  </p>
                </div>
                <Badge tone="amber">Pending</Badge>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Resolved */}
      <SectionCard title="Resolved Requests" description="Approved and rejected allocations" bodyClassName="p-0">
        {resolvedRequests.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={BookOpen}
              title="No resolved requests yet"
              message="Approved or rejected allocation requests will appear here."
            />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {resolvedRequests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#1A2B4A]">{r.studentName} — {r.subject}</p>
                  <p className="text-xs text-[#718096]">
                    {r.registrationNumber} · Class {r.classNumber}
                    {r.rejectionNote && ` · Note: ${r.rejectionNote}`}
                  </p>
                </div>
                {r.status === 'APPROVED' ? (
                  <Badge tone="green">Approved</Badge>
                ) : (
                  <Badge tone="red">Rejected</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* New Request Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            >
              <X size={20} />
            </button>

            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2E5EAA] bg-[#CDE6F7] px-2.5 py-0.5 rounded-full">
                Teacher Request
              </span>
              <h2 className="text-xl font-bold text-[#1A2B4A] mt-1">Request Subject Allocation</h2>
              <p className="text-sm text-gray-500">Pick a student and a subject to request allocation for.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Select
                label="Student"
                options={[
                  { value: '', label: '— Select student —' },
                  ...students.map((s) => ({
                    value: s.id,
                    label: `${s.fullName} (${s.registrationNumber}) · ${classLabel(s)}`,
                  })),
                ]}
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setSelectedSubject('');
                }}
              />

              {selectedStudent && availableSubjects.length === 0 && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  This student is already enrolled in all available subjects for their class.
                </p>
              )}

              {selectedStudent && availableSubjects.length > 0 && (
                <Select
                  label="Subject"
                  options={[
                    { value: '', label: '— Select subject —' },
                    ...availableSubjects.map((s) => ({ value: s, label: s })),
                  ]}
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                />
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={!selectedStudentId || !selectedSubject}
                  className="flex-1"
                >
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
