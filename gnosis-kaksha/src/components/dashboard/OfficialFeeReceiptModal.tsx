'use client';

import React from 'react';
import Image from 'next/image';
import {
  Printer,
  X,
  ShieldCheck,
  Phone,
  MapPin,
  Globe,
  Mail,
  MessageSquare,
  CheckCircle2,
  FileCheck2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/format';
import { QRCodeSVG } from 'qrcode.react';

export interface FeeReceiptData {
  id: string;
  date: string;
  description: string;
  amount: number;
  method: string;
  utr?: string;
  status?: string;
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

interface OfficialFeeReceiptModalProps {
  receipt: FeeReceiptData;
  student: FeeReceiptStudent;
  onClose: () => void;
  copyType?: 'STUDENT COPY' | 'OFFICE COPY' | 'ORIGINAL RECEIPT';
}

/** Helper function to convert numeric amount to Indian currency words */
function numberToWordsINR(amount: number): string {
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

/** Cursive signature SVG for accounts officer */
function AccountsSign() {
  return (
    <svg viewBox="0 0 140 40" xmlns="http://www.w3.org/2000/svg" className="w-32 h-10">
      <path
        d="M8 26 C22 10, 38 8, 52 20 C64 30, 72 12, 86 16 C98 20, 110 32, 122 22 C128 16, 134 22, 138 26"
        fill="none"
        stroke="#1E3A8A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 32 C40 31, 85 31, 134 33"
        fill="none"
        stroke="#1E3A8A"
        strokeWidth="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function OfficialFeeReceiptModal({
  receipt,
  student,
  onClose,
  copyType = 'STUDENT COPY',
}: OfficialFeeReceiptModalProps) {
  // Generate itemized breakdown based on description and purpose
  const breakdownItems = React.useMemo(() => {
    const desc = receipt.description.toLowerCase();

    if (desc.includes('admission') || desc.includes('charges') || desc.includes('t-shirt') || desc.includes('exam')) {
      const examFee = 500;
      const tshirtFee = 1000;
      const registrationFee = Math.max(receipt.amount - (examFee + tshirtFee), 0);

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

      if (registrationFee > 0) {
        items.unshift({
          sl: '00',
          head: 'Registration & Admission Processing',
          purpose: 'Student enrollment & academic documentation',
          amount: registrationFee,
        });
        // renumber
        items.forEach((item, idx) => {
          item.sl = String(idx + 1).padStart(2, '0');
        });
      }
      return items;
    }

    // Default to monthly tuition fee breakdown
    return [
      {
        sl: '01',
        head: 'Monthly Batch Tuition Fee',
        purpose: receipt.description || 'Academic coaching & classroom lectures',
        amount: receipt.amount,
      },
    ];
  }, [receipt]);

  const handlePrint = () => {
    window.print();
  };

  const whatsappMessage = `*Official Fee Payment Receipt — Gnosis Kaksha*
Tagline: “A PLACE FOR EXCELLENCE”
Receipt No: ${receipt.id}
Date: ${formatDate(receipt.date)}
Student: ${student.fullName} (${student.registrationNumber})
Class: Class ${student.classNumber || '10'}${student.stream ? ` (${student.stream})` : ''}
Fee Purpose: ${receipt.description}
Amount Paid: ₹${receipt.amount.toLocaleString('en-IN')} (${numberToWordsINR(receipt.amount)})
Payment Mode: ${receipt.method}${receipt.utr ? ` (UTR: ${receipt.utr})` : ''}
Status: VERIFIED & CLEARED
Website: www.gnosiskaksha.cloud`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-200 max-h-[92vh] overflow-y-auto my-auto print:max-w-none print:w-full print:m-0 print:p-0 print:border-none print:shadow-none print:max-h-none print:overflow-visible">
        {/* Close button (hidden on print) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition print:hidden z-20"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* ════════════════════════════════════════════════════════════════
            PRINTABLE RECEIPT CONTENT AREA
            ════════════════════════════════════════════════════════════════ */}
        <div id="official-receipt-sheet" className="bg-white border-2 border-[#1A2B4A] rounded-xl p-6 sm:p-7 relative overflow-hidden print:border-2 print:border-black print:rounded-none print:p-6">
          {/* Subtle Security Watermark in background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
            <span className="text-[110px] font-black text-[#1A2B4A] rotate-[-25deg]">
              GNOSIS
            </span>
          </div>

          {/* ── 1. Top Header: Logo, Name, Official Tagline, Address, Contact ── */}
          <div className="relative z-10 border-b-2 border-[#1A2B4A] pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0 rounded-xl bg-white p-1 border border-gray-200 shadow-xs flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Gnosis Kaksha Logo"
                    width={58}
                    height={58}
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1A2B4A] leading-tight">
                    GNOSIS KAKSHA
                  </h1>
                  {/* Official Tagline */}
                  <p className="text-xs sm:text-sm font-extrabold tracking-widest text-[#1295D8] uppercase mt-0.5">
                    “A PLACE FOR EXCELLENCE”
                  </p>
                </div>
              </div>

              {/* Copy Badge */}
              <div className="shrink-0 text-center sm:text-right">
                <span className="inline-block rounded-md bg-[#1A2B4A] px-2.5 py-1 text-[10px] font-black tracking-wider text-amber-300 uppercase shadow-xs">
                  {copyType}
                </span>
                <p className="text-[10px] font-bold text-gray-500 mt-1">SESSION: 2026–2027</p>
              </div>
            </div>

            {/* Address bar, Contact details, Website */}
            <div className="mt-3 pt-2.5 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[9px] text-[#4A5568]">
              <div className="flex items-center justify-center sm:justify-start gap-1">
                <MapPin size={11} className="text-[#1295D8] shrink-0" />
                <span className="truncate">Main Road, Ramkrishna Nagar, Assam – 788713</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <Phone size={11} className="text-[#1295D8] shrink-0" />
                <span>+91 94350 12345 / +91 98765 43210</span>
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-1">
                <Globe size={11} className="text-[#1295D8] shrink-0" />
                <span className="font-semibold text-[#1A2B4A]">www.gnosiskaksha.cloud</span>
              </div>
            </div>
          </div>

          {/* ── 2. Receipt Title Banner ── */}
          <div className="relative z-10 bg-gradient-to-r from-[#1A2B4A] via-[#2E5EAA] to-[#1A2B4A] text-white px-4 py-2 mt-3 rounded-lg flex items-center justify-between text-xs font-bold shadow-xs">
            <span className="tracking-widest uppercase text-[11px]">OFFICIAL MONEY RECEIPT</span>
            <div className="flex items-center gap-4 text-[10px]">
              <span>Receipt No: <strong className="font-mono text-amber-300">{receipt.id}</strong></span>
              <span>Date: <strong className="text-white">{formatDate(receipt.date)}</strong></span>
            </div>
          </div>

          {/* ── 3. Student & Payment Details Box ── */}
          <div className="relative z-10 mt-3 rounded-lg border border-gray-200 bg-[#F8FAFC] p-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-[#1A2B4A]">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Student Name</p>
                <p className="font-black text-sm text-[#1A2B4A] truncate">{student.fullName}</p>
              </div>

              <div>
                <p className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Registration Number</p>
                <p className="font-mono font-bold text-xs text-[#1295D8]">{student.registrationNumber}</p>
              </div>

              <div>
                <p className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Class &amp; Stream</p>
                <p className="font-semibold text-xs text-gray-800">
                  Class {student.classNumber || '10'} {student.stream ? `• ${student.stream}` : ''}
                </p>
              </div>

              <div>
                <p className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Father&apos;s / Guardian&apos;s Name</p>
                <p className="font-semibold text-xs text-gray-800 truncate">{student.parentName || 'Guardian'}</p>
              </div>

              <div>
                <p className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Contact Number</p>
                <p className="font-semibold text-xs text-gray-800">{student.mobile || '—'}</p>
              </div>

              <div>
                <p className="text-[8px] font-bold uppercase tracking-wider text-gray-400">Payment Mode / UTR</p>
                <p className="font-bold text-xs text-emerald-700 truncate">
                  {receipt.method} {receipt.utr ? `(Ref: ${receipt.utr})` : ''}
                </p>
              </div>
            </div>
          </div>

          {/* ── 4. Itemized Fee Table (What fee was collected & for what purpose) ── */}
          <div className="relative z-10 mt-3 overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1A2B4A] text-white text-[9px] uppercase tracking-wider">
                  <th className="py-2 px-3 w-10 text-center font-bold">Sl.</th>
                  <th className="py-2 px-3 font-bold">Fee Particulars</th>
                  <th className="py-2 px-3 font-bold">Purpose &amp; Coverage</th>
                  <th className="py-2 px-3 text-right font-bold w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {breakdownItems.map((item) => (
                  <tr key={item.sl} className="text-[#1A2B4A]">
                    <td className="py-2 px-3 text-center font-mono text-[10px] text-gray-500">{item.sl}</td>
                    <td className="py-2 px-3 font-bold text-xs">{item.head}</td>
                    <td className="py-2 px-3 text-gray-600 text-[11px]">{item.purpose}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-xs text-[#1A2B4A]">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {/* Total Net Amount */}
                <tr className="bg-[#F0F7FD] border-t-2 border-[#1A2B4A] text-[#1A2B4A]">
                  <td colSpan={3} className="py-2.5 px-3 text-right font-bold text-xs uppercase tracking-wide">
                    Total Amount Received:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-[#1295D8]">
                    ₹{receipt.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount in words & status badge */}
          <div className="relative z-10 mt-3 rounded-lg border border-blue-100 bg-[#F0F9FF] p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-gray-500">Amount in Words</p>
              <p className="font-bold text-xs text-[#1A2B4A] italic">{numberToWordsINR(receipt.amount)}</p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 self-start sm:self-center">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white uppercase shadow-xs tracking-wider">
                <ShieldCheck size={13} /> Paid &amp; Verified
              </span>
            </div>
          </div>

          {/* ── 5. Signatory, Stamp & Terms Footer ── */}
          <div className="relative z-10 mt-4 pt-3 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
              {/* QR Verification & Instructions */}
              <div className="flex items-center gap-3">
                <div className="rounded-md border border-gray-300 bg-white p-1 shadow-2xs shrink-0">
                  <QRCodeSVG
                    value={`https://gnosiskaksha.cloud/verify/receipt/${receipt.id}`}
                    size={52}
                    level="M"
                    fgColor="#1A2B4A"
                  />
                </div>
                <div className="text-[8px] text-gray-500 max-w-[220px] leading-tight">
                  <p className="font-bold text-[#1A2B4A] mb-0.5">TERMS &amp; CONDITIONS</p>
                  <p>1. Fees once paid are non-refundable and non-transferable.</p>
                  <p>2. Keep this receipt as official proof of payment.</p>
                </div>
              </div>

              {/* Official Seal / Stamp */}
              <div className="rounded-full border-2 border-emerald-600/40 p-2 text-center text-emerald-800 transform rotate-[-6deg] select-none shrink-0 hidden sm:block">
                <div className="border border-dashed border-emerald-600/50 rounded-full px-2 py-1 text-[7.5px] font-black uppercase tracking-widest leading-tight">
                  GNOSIS KAKSHA<br />
                  ★ VERIFIED FEE ★<br />
                  ACCOUNTS DEPT.
                </div>
              </div>

              {/* Authorized Signatory */}
              <div className="flex flex-col items-center text-center">
                <AccountsSign />
                <div className="w-32 border-t border-gray-400 pt-0.5 mt-0.5">
                  <p className="text-[8.5px] font-bold uppercase tracking-wider text-[#1A2B4A] leading-tight">
                    Authorized Signatory
                  </p>
                  <p className="text-[7.5px] text-gray-500 leading-tight">Accounts &amp; Cashier Office</p>
                </div>
              </div>
            </div>

            <div className="mt-3 text-center text-[7.5px] text-gray-400 border-t border-gray-100 pt-1.5">
              This is a computer-generated official money receipt issued by Gnosis Kaksha Management System.
            </div>
          </div>
        </div>

        {/* ── 6. Action Bar (Screen Only, Hidden on Print) ── */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 print:hidden">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-xs"
          >
            <MessageSquare size={16} /> Share on WhatsApp
          </a>

          <Button
            type="button"
            onClick={handlePrint}
            className="gap-2 bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] text-white shadow-sm hover:opacity-95"
          >
            <Printer size={16} /> Print Receipt (PDF)
          </Button>
        </div>
      </div>

      {/* ── Print Specific Styles ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          *,
          *::before,
          *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          html,
          body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Hide all page content except the receipt */
          body > * {
            display: none !important;
          }

          body main,
          body [data-nextjs-scroll-focus-boundary],
          body #official-receipt-sheet,
          body #official-receipt-sheet * {
            display: block !important;
            visibility: visible !important;
          }

          #official-receipt-sheet {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: 2px solid #000000 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 16mm !important;
          }

          #official-receipt-sheet table {
            display: table !important;
            width: 100% !important;
          }

          #official-receipt-sheet thead {
            display: table-header-group !important;
          }

          #official-receipt-sheet tbody {
            display: table-row-group !important;
          }

          #official-receipt-sheet tfoot {
            display: table-footer-group !important;
          }

          #official-receipt-sheet tr {
            display: table-row !important;
          }

          #official-receipt-sheet th,
          #official-receipt-sheet td {
            display: table-cell !important;
          }

          .print\\:hidden,
          button,
          nav,
          aside,
          header {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
