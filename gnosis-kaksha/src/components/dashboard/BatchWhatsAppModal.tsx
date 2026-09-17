'use client';

import { useState } from 'react';
import { X, Send, ExternalLink, CheckCircle2, AlertCircle, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatINR, RosterStudent } from '@/lib/institute-data';
import { getWhatsAppDirectUrl, generateFeeReminderMessage } from '@/lib/whatsapp';
import toast from 'react-hot-toast';

interface BatchWhatsAppModalProps {
  students: RosterStudent[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function BatchWhatsAppModal({
  students,
  onClose,
  onSuccess,
}: BatchWhatsAppModalProps) {
  const pendingStudents = students.filter(
    (s) => s.status === 'active' && s.feeState === 'due' && s.amountDue > 0
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(
    pendingStudents.map((s) => s.id)
  );
  const [isSending, setIsSending] = useState(false);
  const [sentSuccessCount, setSentSuccessCount] = useState<number | null>(null);

  const totalSelectedDues = pendingStudents
    .filter((s) => selectedIds.includes(s.id))
    .reduce((sum, s) => sum + s.amountDue, 0);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pendingStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingStudents.map((s) => s.id));
    }
  };

  const handleSendBatchApi = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one student.');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/whatsapp/fee-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: true,
          studentIds: selectedIds,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSentSuccessCount(data.sentCount);
        toast.success(
          `WhatsApp fee reminders processed for ${data.sentCount} student(s)!`
        );
        onSuccess?.();
      } else {
        toast.error(data.error || 'Failed to dispatch batch WhatsApp reminders');
      }
    } catch {
      toast.error('Network error during batch dispatch');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Users size={22} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Bulk Notification
            </span>
            <h2 className="text-xl font-bold text-[#1A2B4A] mt-1">
              Broadcast WhatsApp Fee Reminders
            </h2>
          </div>
        </div>

        {sentSuccessCount !== null ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-[#1A2B4A]">
              Reminders Successfully Dispatched!
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              Processed fee reminders for <b>{sentSuccessCount}</b> student(s) with total pending dues of{' '}
              <b>{formatINR(totalSelectedDues)}</b>.
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={onClose}
              className="mt-4"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* Summary Strip */}
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3.5 border border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Selected Students</p>
                <p className="text-lg font-bold text-[#1A2B4A]">
                  {selectedIds.length} of {pendingStudents.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Total Pending Dues</p>
                <p className="text-lg font-bold text-amber-600">
                  {formatINR(totalSelectedDues)}
                </p>
              </div>
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100 mb-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-semibold text-[#1295D8] hover:text-[#2E5EAA] transition"
              >
                {selectedIds.length === pendingStudents.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
              <span className="text-xs text-gray-400">
                Click student row or WhatsApp button to message individually
              </span>
            </div>

            {/* Students List */}
            <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 pr-1 mb-5">
              {pendingStudents.map((s) => {
                const isSelected = selectedIds.includes(s.id);
                const phone = s.mobile || '9876543210';
                const message = generateFeeReminderMessage({
                  studentName: s.fullName,
                  registrationNumber: s.registrationNumber,
                  classNumber: s.classNumber,
                  amountDue: s.amountDue,
                  parentName: s.parentName,
                });
                const directUrl = getWhatsAppDirectUrl(phone, message);

                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between py-2.5 px-2 rounded-lg transition ${
                      isSelected ? 'bg-emerald-50/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(s.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1A2B4A] truncate">
                          {s.fullName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {s.registrationNumber} · Class {s.classNumber} · Phone: {phone}
                        </p>
                      </div>
                    </label>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-amber-600 font-mono">
                        {formatINR(s.amountDue)}
                      </span>
                      <a
                        href={directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs font-semibold transition"
                        title="Open direct WhatsApp chat"
                      >
                        <ExternalLink size={12} /> Chat
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSendBatchApi}
                isLoading={isSending}
                disabled={selectedIds.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center justify-center gap-2"
              >
                <Send size={16} /> Broadcast WhatsApp Reminders ({selectedIds.length})
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
