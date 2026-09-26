'use client';

import React from 'react';
import { OFFICE_PHONE_DISPLAY } from '@/lib/institute-contact';
import Image from 'next/image';
import { Printer, X, MessageSquare, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import { QRCodeSVG } from 'qrcode.react';

export interface FeeReceiptData {
  id: string;
  /** Official receipt number (issued on verification). Falls back to `id` for display. */
  receiptNumber?: string | null;
  date: string;
  description: string;
  amount: number;
  method: string;
  utr?: string;
  /** 'verified' / 'paid' (or omitted) = cleared; anything else is shown as not yet verified. */
  status?: string;
}

/** Receipt number to show: the official one if issued, else the internal reference. */
function receiptNo(receipt: FeeReceiptData): string {
  return receipt.receiptNumber || receipt.id;
}

/** Omitted status is treated as verified for backward compatibility. */
export function isReceiptVerified(receipt: FeeReceiptData): boolean {
  return !receipt.status || receipt.status === 'verified' || receipt.status === 'paid';
}

export interface FeeReceiptStudent {
  fullName: string;
  registrationNumber: string;
  classNumber?: number;
  stream?: string | null;
  board?: string;
  parentName?: string;
  mobile?: string;
  address?: string;
}

export interface ReceiptSheetProps {
  receipt: FeeReceiptData;
  student: FeeReceiptStudent;
  copyType?: string;
  credentials?: {
    username: string;
    password?: string;
  };
}

/** Helper function to convert numeric amount to Indian currency words */
export function numberToWordsINR(amount: number): string {
  const num = Math.floor(amount);
  if (num === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertGroup(n: number): string {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;

  let result = '';
  if (crore > 0) result += convertGroup(crore) + ' Crore ';
  if (lakh > 0) result += convertGroup(lakh) + ' Lakh ';
  if (thousand > 0) result += convertGroup(thousand) + ' Thousand ';
  if (remainder > 0) result += convertGroup(remainder) + ' ';

  return `Rupees ${result.trim()} Only`;
}

/** Build itemized rows from receipt description */
function buildItems(receipt: FeeReceiptData) {
  const desc = (receipt.description || '').toLowerCase();
  if (desc.includes('admission') || desc.includes('charges') || desc.includes('t-shirt') || desc.includes('exam')) {
    const examFee = 350;
    const tshirtFee = 600;
    const tuitionOrReg = Math.max(receipt.amount - (examFee + tshirtFee), 0);

    const items = [
      {
        sl: '01',
        head: 'Annual Examination & Assessment Fee',
        purpose: 'Periodic unit tests, term exams & evaluation charges',
        amount: examFee,
      },
      {
        sl: '02',
        head: 'Institute Uniform & Study Kit',
        purpose: 'Official Gnosis Kaksha T-Shirt, kit & ID badge',
        amount: tshirtFee,
      },
    ];

    if (tuitionOrReg > 0) {
      items.unshift({
        sl: '00',
        head: 'Registration & Advance Tuition Fee',
        purpose: 'Academic enrollment, batch allocation & documentation',
        amount: tuitionOrReg,
      });
      items.forEach((item, idx) => {
        item.sl = String(idx + 1).padStart(2, '0');
      });
    }
    return items;
  }

  return [
    {
      sl: '01',
      head: 'Monthly Batch Tuition Fee',
      purpose: receipt.description?.replace(' (Pending Verification)', '') || 'Academic coaching & classroom lectures',
      amount: receipt.amount,
    },
  ];
}

/**
 * Single-Page Printable Receipt Sheet
 * Engineered to fit strictly on 1 A4 page with zero overflow
 */
export function ReceiptSheet({
  receipt,
  student,
  copyType = 'STUDENT COPY',
  credentials,
}: ReceiptSheetProps) {
  const items = React.useMemo(() => buildItems(receipt), [receipt]);
  const inWords = React.useMemo(() => numberToWordsINR(receipt.amount), [receipt.amount]);
  const verified = isReceiptVerified(receipt);
  const number = receiptNo(receipt);

  const classLabel = [
    student.classNumber ? `Class ${student.classNumber}` : null,
    student.stream,
    student.board,
  ].filter(Boolean).join(' · ') || '—';

  return (
    <div className="receipt-single-page bg-white text-black p-5 sm:p-6 border-2 border-black rounded-none relative overflow-hidden text-xs max-w-[780px] mx-auto select-text font-serif">
      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
        <span className="text-[100px] font-black text-[#1A2B4A] rotate-[-25deg] tracking-widest">
          GNOSIS
        </span>
      </div>

      <div className="relative z-10 space-y-3">
        {/* ── 1. Header: Logo, Name, Address, Contact, Session ── */}
        <div className="border-b-2 border-black pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 rounded-lg bg-white p-1 border border-gray-300 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="Gnosis Kaksha"
                  width={50}
                  height={50}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#1A2B4A] font-sans leading-none">
                  GNOSIS KAKSHA
                </h1>
                <p className="text-[10px] font-bold tracking-widest text-[#1295D8] uppercase mt-0.5 font-sans">
                  “A PLACE FOR EXCELLENCE”
                </p>
                <p className="text-[9px] text-gray-700 mt-0.5 leading-tight font-sans">
                  Main Road, Ramkrishna Nagar, Cachar, Assam – 788713 &nbsp;|&nbsp; Ph: {OFFICE_PHONE_DISPLAY}
                </p>
                <p className="text-[9px] text-gray-600 leading-tight font-sans">
                  Email: query@gnosiskaksha.in &nbsp;|&nbsp; Web: www.gnosiskaksha.cloud
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block border-2 border-black px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black bg-gray-100">
                {copyType}
              </span>
              <p className="text-[9px] font-bold text-gray-600 mt-1 font-sans">ACADEMIC SESSION: 2026–2027</p>
            </div>
          </div>
        </div>

        {/* ── 2. Receipt Title Banner ── */}
        <div className="bg-[#1A2B4A] text-white px-3 py-1.5 rounded-none flex items-center justify-between text-xs font-bold font-sans">
          <span className="tracking-wider uppercase text-[10px]">
            {verified ? <>OFFICIAL MONEY &amp; FEE RECEIPT</> : <>PAYMENT ACKNOWLEDGEMENT · NOT A RECEIPT</>}
          </span>
          <div className="flex items-center gap-4 text-[10px]">
            <span>{verified ? 'Receipt No' : 'Ref'}: <strong className="font-mono text-amber-300">{number}</strong></span>
            <span>Date: <strong className="text-white">{formatDate(receipt.date)}</strong></span>
          </div>
        </div>

        {/* ── 3. Student & Payment Details Table ── */}
        <table className="w-full border-collapse border border-gray-400 text-[10.5px]">
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="w-1/4 p-1.5 bg-gray-50 border-r border-gray-300 text-gray-600 font-sans">
                Student Name:
              </td>
              <td className="w-1/4 p-1.5 border-r border-gray-300 font-bold text-black font-sans text-[11px]">
                {student.fullName}
              </td>
              <td className="w-1/4 p-1.5 bg-gray-50 border-r border-gray-300 text-gray-600 font-sans">
                Registration No:
              </td>
              <td className="w-1/4 p-1.5 font-mono font-bold text-[#1A2B4A]">
                {student.registrationNumber}
              </td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="p-1.5 bg-gray-50 border-r border-gray-300 text-gray-600 font-sans">
                Class / Course:
              </td>
              <td className="p-1.5 border-r border-gray-300 font-semibold text-gray-900 font-sans">
                {classLabel}
              </td>
              <td className="p-1.5 bg-gray-50 border-r border-gray-300 text-gray-600 font-sans">
                Father / Guardian:
              </td>
              <td className="p-1.5 font-semibold text-gray-900 font-sans truncate">
                {student.parentName || 'Guardian'}
              </td>
            </tr>
            <tr>
              <td className="p-1.5 bg-gray-50 border-r border-gray-300 text-gray-600 font-sans">
                Payment Mode:
              </td>
              <td className="p-1.5 border-r border-gray-300 font-semibold text-emerald-800 font-sans">
                {receipt.method || 'UPI'}
              </td>
              <td className="p-1.5 bg-gray-50 border-r border-gray-300 text-gray-600 font-sans">
                UPI Ref / UTR:
              </td>
              <td className="p-1.5 font-mono font-bold text-black">
                {receipt.utr || '—'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── 4. Itemized Fee Table ── */}
        <table className="w-full border-collapse border-2 border-black text-[10.5px]">
          <thead>
            <tr className="bg-[#1A2B4A] text-white text-[9px] uppercase tracking-wider font-sans">
              <th className="py-1.5 px-2.5 w-10 text-center border-r border-gray-700">Sl.</th>
              <th className="py-1.5 px-2.5 text-left border-r border-gray-700">Fee Particulars</th>
              <th className="py-1.5 px-2.5 text-left border-r border-gray-700">Purpose / Coverage</th>
              <th className="py-1.5 px-2.5 text-right w-28">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {items.map((item) => (
              <tr key={item.sl} className="text-black">
                <td className="py-1.5 px-2.5 text-center font-mono text-[10px] text-gray-600 border-r border-gray-300">
                  {item.sl}
                </td>
                <td className="py-1.5 px-2.5 font-bold font-sans border-r border-gray-300">
                  {item.head}
                </td>
                <td className="py-1.5 px-2.5 text-gray-700 border-r border-gray-300 text-[10px]">
                  {item.purpose}
                </td>
                <td className="py-1.5 px-2.5 text-right font-mono font-bold text-black">
                  ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            {/* Filler rows if less than 3 items to maintain standard receipt proportion */}
            {items.length < 3 && Array.from({ length: 3 - items.length }).map((_, i) => (
              <tr key={`fill-${i}`} className="h-6">
                <td className="border-r border-gray-300">&nbsp;</td>
                <td className="border-r border-gray-300">&nbsp;</td>
                <td className="border-r border-gray-300">&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-black font-sans font-bold text-black">
              <td colSpan={3} className="py-2 px-3 text-right text-[11px] uppercase tracking-wide">
                {verified ? 'Total Amount Received:' : 'Total Amount Submitted:'}
              </td>
              <td className="py-2 px-3 text-right font-mono font-black text-sm text-[#1A2B4A]">
                ₹{receipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ── 5. Amount in Words & Cleared Badge ── */}
        <div className="border border-gray-300 bg-gray-50 px-3 py-1.5 flex items-center justify-between text-[10px]">
          <div>
            <span className="text-gray-600 font-sans font-semibold">Amount in Words: </span>
            <span className="font-bold text-black italic">{inWords}</span>
          </div>
          {verified ? (
            <span className="inline-flex items-center gap-1 font-sans font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 text-[9px] uppercase">
              <ShieldCheck size={12} /> Payment Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-sans font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 text-[9px] uppercase">
              Not Verified{receipt.status ? ` · ${receipt.status}` : ''}
            </span>
          )}
        </div>

        {/* ── 6. Student Portal Login Credentials (If Provided) ── */}
        {credentials && (
          <div className="border border-blue-200 bg-blue-50/60 p-2 text-[9.5px] font-sans flex items-center justify-between gap-4">
            <div>
              <span className="font-bold text-[#1A2B4A] uppercase text-[9px]">Student Portal Access: </span>
              <span className="text-gray-700">www.gnosiskaksha.cloud/login</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Login ID: <strong className="font-mono text-[#1A2B4A]">{credentials.username}</strong></span>
              {credentials.password && (
                <span>Password: <strong className="font-mono text-[#1A2B4A]">{credentials.password}</strong></span>
              )}
            </div>
          </div>
        )}

        {/* ── 7. Seal, Terms & Signatory Footer ── */}
        <div className="pt-2 border-t border-gray-300 flex items-end justify-between gap-4">
          {/* Verification QR & Terms */}
          <div className="flex items-center gap-2.5">
            <div className="border border-gray-300 p-1 bg-white shrink-0">
              <QRCodeSVG
                value={`https://gnosiskaksha.cloud/verify/receipt/${number}`}
                size={48}
                level="M"
                fgColor="#1A2B4A"
              />
            </div>
            <div className="text-[7.5px] text-gray-600 leading-tight max-w-[240px] font-sans">
              <p className="font-bold text-black mb-0.5 uppercase">Important Terms:</p>
              <p>1. Fee once paid is non-refundable and non-transferable under any circumstances.</p>
              <p>2. Keep this official receipt as proof of admission and payment verification.</p>
              <p>3. Quote Registration No. for all future correspondence.</p>
            </div>
          </div>

          {/* Official Seal / Stamp */}
          <div className="shrink-0 flex items-center justify-center">
            <div className="w-[78px] h-[78px] rounded-full border-2 border-emerald-700/60 flex items-center justify-center p-0.5 text-center text-emerald-800 rotate-[-4deg] select-none">
              <div className="w-full h-full rounded-full border border-dashed border-emerald-700/60 flex flex-col items-center justify-center text-[5.5px] font-black uppercase tracking-wider leading-tight">
                <span>GNOSIS KAKSHA</span>
                <span className="text-[5px] text-emerald-600 my-0.5">★ OFFICIAL FEE ★</span>
                <span>ACCOUNTS DEPT.</span>
              </div>
            </div>
          </div>

          {/* Authorized Signatory */}
          <div className="text-center shrink-0 w-36">
            <div className="h-8 flex items-center justify-center">
              <svg viewBox="0 0 120 30" className="w-24 h-6 text-[#1A2B4A]">
                <path
                  d="M10 20 C25 8, 40 6, 55 18 C65 26, 75 10, 85 14 C95 18, 105 24, 115 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="border-t border-black pt-1">
              <p className="text-[8px] font-bold uppercase tracking-wider text-black font-sans leading-none">
                Authorized Signatory
              </p>
              <p className="text-[7px] text-gray-600 font-sans mt-0.5">Accounts &amp; Cashier Desk</p>
            </div>
          </div>
        </div>

        {/* ── 8. Bottom Disclaimer ── */}
        <div className="border-t border-gray-200 pt-1 text-center text-[7px] text-gray-500 font-sans">
          This is an official computer-generated receipt issued by Gnosis Kaksha Management System. &nbsp;|&nbsp; Assam, India
        </div>
      </div>
    </div>
  );
}

/**
 * Official Modal wrapper (for Student Portal & Accountant views)
 */
export function OfficialFeeReceiptModal({
  receipt,
  student,
  onClose,
  copyType = 'STUDENT COPY',
}: {
  receipt: FeeReceiptData;
  student: FeeReceiptStudent;
  onClose: () => void;
  copyType?: 'STUDENT COPY' | 'OFFICE COPY' | 'ORIGINAL RECEIPT';
}) {
  const inWords = React.useMemo(() => numberToWordsINR(receipt.amount), [receipt.amount]);
  const verified = isReceiptVerified(receipt);

  const whatsappMessage =
    `*Official Fee Receipt — Gnosis Kaksha*\n` +
    `Receipt No: ${receiptNo(receipt)}\n` +
    `Date: ${formatDate(receipt.date)}\n` +
    `Student: ${student.fullName} (${student.registrationNumber})\n` +
    `Class: ${student.classNumber ? `Class ${student.classNumber}` : '—'}${student.stream ? ` (${student.stream})` : ''}\n` +
    `Amount Paid: ₹${receipt.amount.toLocaleString('en-IN')} (${inWords})\n` +
    `Payment Mode: ${receipt.method}${receipt.utr ? ` (UTR: ${receipt.utr})` : ''}\n` +
    `Status: VERIFIED & CLEARED\n` +
    `Website: www.gnosiskaksha.cloud`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto receipt-modal-backdrop">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-4 sm:p-6 shadow-2xl border border-gray-200 max-h-[95vh] overflow-y-auto my-auto receipt-modal-card">
        {/* Close Button (Hidden on Print) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition print:hidden z-20"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Receipt Sheet */}
        <ReceiptSheet receipt={receipt} student={student} copyType={copyType} />

        {/* Action Bar (Hidden on Print) */}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-gray-200 print:hidden">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs">
            Close
          </Button>

          {!verified && (
            <p className="mr-auto text-xs font-medium text-amber-700">
              This payment is not verified yet — an official receipt can be printed once it is verified.
            </p>
          )}

          {verified && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-xs"
          >
            <MessageSquare size={14} /> WhatsApp
          </a>
          )}

          {verified && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] px-4 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 transition"
          >
            <Printer size={15} /> Print / Save PDF
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
