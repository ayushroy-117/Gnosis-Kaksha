'use client';

import { useState } from 'react';
import { X, Send, ExternalLink, Copy, Check, MessageSquare, AlertCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { generateFeeReminderMessage, getWhatsAppDirectUrl } from '@/lib/whatsapp';
import toast from 'react-hot-toast';

interface WhatsAppReminderModalProps {
  student: {
    id: string;
    fullName: string;
    registrationNumber: string;
    classNumber: number;
    amountDue: number;
    mobile?: string;
    parentName?: string;
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export function WhatsAppReminderModal({
  student,
  onClose,
  onSuccess,
}: WhatsAppReminderModalProps) {
  const defaultPhone = student.mobile || '9876543210';
  const [phone, setPhone] = useState(defaultPhone);
  const [copied, setCopied] = useState(false);
  const [isSendingApi, setIsSendingApi] = useState(false);

  const initialMessage = generateFeeReminderMessage({
    studentName: student.fullName,
    registrationNumber: student.registrationNumber,
    classNumber: student.classNumber,
    amountDue: student.amountDue,
    parentName: student.parentName,
  });

  const [message, setMessage] = useState(initialMessage);

  const directUrl = getWhatsAppDirectUrl(phone, message);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('WhatsApp reminder message copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendViaApp = () => {
    window.open(directUrl, '_blank', 'noopener,noreferrer');
    toast.success(`WhatsApp chat opened for ${student.fullName}!`);
    onSuccess?.();
    onClose();
  };

  const handleSendViaApi = async () => {
    setIsSendingApi(true);
    try {
      const res = await fetch('/api/whatsapp/fee-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          phone,
          customMessage: message,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.provider === 'meta_cloud_api' || data.provider === 'twilio') {
          toast.success(`WhatsApp reminder sent successfully via ${data.provider}!`);
        } else {
          // Direct wa link fallback
          toast.success('Reminder prepared! Opening WhatsApp...');
          window.open(data.directUrl, '_blank', 'noopener,noreferrer');
        }
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.error || 'Failed to dispatch WhatsApp reminder');
      }
    } catch {
      toast.error('Network error sending WhatsApp reminder');
    } finally {
      setIsSendingApi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-200">
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
            {/* WhatsApp Icon SVG */}
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 15 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.35C9.33 7.35 9 7.42 8.73 7.71C8.45 8.01 7.68 8.74 7.68 10.22C7.68 11.7 8.76 13.13 8.91 13.33C9.06 13.53 11.04 16.58 14.07 17.89C14.79 18.2 15.35 18.39 15.79 18.53C16.51 18.76 17.17 18.73 17.69 18.65C18.27 18.56 19.48 17.92 19.73 17.22C19.98 16.51 19.98 15.91 19.91 15.79C19.83 15.66 19.63 15.59 19.33 15.44C19.03 15.29 17.56 14.56 17.28 14.46C17.01 14.36 16.81 14.31 16.61 14.61C16.41 14.91 15.84 15.59 15.66 15.79C15.49 15.99 15.31 16.01 15.01 15.86C14.71 15.71 13.75 15.4 12.61 14.38C11.73 13.59 11.13 12.61 10.96 12.31C10.79 12.01 10.94 11.85 11.09 11.7C11.23 11.56 11.39 11.34 11.54 11.17C11.7 11 11.75 10.87 11.85 10.67C11.95 10.47 11.9 10.3 11.83 10.15C11.75 10 11.17 8.57 10.92 7.97C10.69 7.39 10.45 7.46 10.27 7.45C10.1 7.45 9.9 7.35 9.53 7.35Z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Fee Pending Reminder
            </span>
            <h2 className="text-xl font-bold text-[#1A2B4A] mt-1">
              WhatsApp Reminder
            </h2>
          </div>
        </div>

        {/* Student Snapshot */}
        <div className="mb-4 rounded-xl bg-gray-50 p-3 border border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-semibold text-[#1A2B4A] text-sm">{student.fullName}</p>
            <p className="text-xs text-gray-500">
              {student.registrationNumber} · Class {student.classNumber}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500">Pending Amount</span>
            <p className="text-base font-bold text-amber-600">
              ₹{student.amountDue.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Phone Input */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 flex items-center gap-1.5">
            <Phone size={14} className="text-gray-400" /> Recipient WhatsApp Number
          </label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210 or 919876543210"
            className="text-sm font-mono"
          />
        </div>

        {/* Message Editor */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
              <MessageSquare size={14} className="text-gray-400" /> Message Preview
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-medium text-[#1295D8] hover:text-[#2E5EAA] flex items-center gap-1"
            >
              {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full text-xs font-mono rounded-lg border-2 border-gray-300 p-3 text-gray-800 focus:border-[#1295D8] focus:outline-none focus:ring-2 focus:ring-[rgba(18,149,216,0.15)] bg-[#FBFDFE]"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleSendViaApp}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none flex items-center justify-center gap-1.5"
          >
            <ExternalLink size={16} /> Open in WhatsApp
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSendViaApi}
            isLoading={isSendingApi}
            className="flex-1 flex items-center justify-center gap-1.5"
          >
            <Send size={16} /> Send via API
          </Button>
        </div>
      </div>
    </div>
  );
}
