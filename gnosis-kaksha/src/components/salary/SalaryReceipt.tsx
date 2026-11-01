'use client';

import Image from 'next/image';
import { Printer, User, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SignatureImg, DIRECTOR_SIGNATURE_SRC } from '@/components/id-card/parts';
import { ACCOUNTANT_SIGNATURE_SRC, numberToWordsINR } from '@/components/dashboard/OfficialFeeReceiptModal';
import { formatDate } from '@/lib/format';
import {
  DIRECTOR_NAME,
  DIRECTOR_TITLE,
  HELPLINE_DISPLAY,
  INSTITUTE_ADDRESS_SHORT,
  INSTITUTE_NAME,
  INSTITUTE_TAGLINE,
  SITE_HOST,
} from '@/lib/institute-contact';
import { periodLabel, type SalaryPayment } from '@/lib/salary';

const inr = (n: number) => `₹ ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-1.5 text-[11px]">
      <span className="w-24 shrink-0 text-gray-500">{label}</span>
      <span>:</span>
      <span className="font-semibold text-black">{value || '—'}</span>
    </div>
  );
}

/** Printable salary receipt (layout follows the institute's sample). */
export function SalaryReceiptSheet({ p }: { p: SalaryPayment }) {
  const lines = [...p.earnings.map((l) => ({ ...l, deduction: false })), ...p.deductions.map((l) => ({ ...l, deduction: true }))];
  return (
    <div className="receipt-single-page mx-auto max-w-[780px] select-text overflow-hidden border-2 border-[#0F172A] bg-white text-xs text-black">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 bg-[#0F172A] px-5 py-3 text-white">
        <div className="flex items-center gap-3">
          <Image src="/logo-white.png" alt="Gnosis Kaksha" width={56} height={56} className="h-14 w-14 object-contain" />
          <div>
            <p className="text-2xl font-black tracking-wide">
              GNOSIS <span className="text-amber-400">KAKSHA</span>
            </p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-slate-300">{INSTITUTE_TAGLINE}</p>
          </div>
        </div>
        <div className="space-y-0.5 text-right text-[10px] text-slate-200">
          <p>{INSTITUTE_ADDRESS_SHORT}</p>
          <p>+91 {HELPLINE_DISPLAY}</p>
          <p>www.{SITE_HOST.replace(/^www\./, '')}</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-black tracking-tight text-[#0F172A]">
            SALARY <span className="text-amber-500">RECEIPT</span>
          </h1>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <Detail label="Receipt No." value={p.receiptNumber} />
            <Detail label="Pay Period" value={periodLabel(p.period)} />
            <Detail label="Issue Date" value={p.paymentDate ? formatDate(p.paymentDate) : 'Pending'} />
          </div>
        </div>

        {/* Teacher details */}
        <div className="flex gap-4 rounded-lg border border-gray-300 p-3">
          <div className="grid flex-1 grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <p className="col-span-full mb-1 text-[11px] font-black uppercase tracking-wider text-[#0F172A]">Staff Details</p>
            <Detail label="Name" value={p.staffName} />
            <Detail label="Department" value={p.department} />
            <Detail label="Staff ID" value={p.staffCode} />
            <Detail label="Subject(s)" value={p.subjects} />
            <Detail label="Designation" value={p.designation} />
            <Detail label="Date of Joining" value={p.dateOfJoining ? formatDate(p.dateOfJoining) : null} />
          </div>
          <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-300 bg-gray-50">
            {p.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- auth-gated API image
              <img src={p.photoUrl} alt={p.staffName} className="h-full w-full object-cover" />
            ) : (
              <User size={32} className="text-gray-400" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
          {/* Salary details */}
          <table className="w-full border-collapse border border-gray-300 text-[11px]">
            <thead>
              <tr className="bg-[#0F172A] text-left text-[10px] uppercase tracking-wider text-white">
                <th className="w-10 p-1.5">Sl.</th>
                <th className="p-1.5">Particulars</th>
                <th className="p-1.5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className={`border-b border-gray-200 ${l.deduction ? 'bg-red-50/60' : 'bg-emerald-50/50'}`}>
                  <td className="p-1.5 text-center">{i + 1}</td>
                  <td className="p-1.5">{l.deduction ? `${l.label} (Deduction)` : l.label}</td>
                  <td className="p-1.5 text-right font-semibold">{l.deduction ? '− ' : ''}{inr(l.amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-400 font-bold">
                <td />
                <td className="p-1.5">GROSS SALARY</td>
                <td className="p-1.5 text-right">{inr(p.gross)}</td>
              </tr>
              <tr className="font-bold">
                <td />
                <td className="p-1.5">TOTAL DEDUCTION</td>
                <td className="p-1.5 text-right">{inr(p.totalDeduction)}</td>
              </tr>
              <tr className="bg-emerald-100 text-[13px] font-black">
                <td />
                <td className="p-2">NET SALARY {p.status === 'paid' ? 'PAID' : 'PAYABLE'}</td>
                <td className="p-2 text-right">{inr(p.net)}</td>
              </tr>
            </tbody>
          </table>

          <div className="space-y-3">
            <div className="rounded-lg border border-gray-300 p-3">
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-[#0F172A]">Payment Information</p>
              <Detail label="Payment Date" value={p.paymentDate ? formatDate(p.paymentDate) : 'Pending'} />
              <Detail label="Payment Mode" value={p.paymentMode} />
              <Detail label="Transaction ID" value={p.reference} />
              <Detail label="Bank Name" value={p.bankName} />
              <Detail label="Account No." value={p.bankAccountMasked} />
            </div>
            <div className="rounded-lg border border-gray-300 p-3">
              <p className="mb-1 text-[11px] font-black uppercase tracking-wider text-[#0F172A]">Amount in Words</p>
              <p className="font-semibold italic text-[#1E3A8A]">{numberToWordsINR(p.net)}</p>
            </div>
          </div>
        </div>

        {p.note && <p className="text-[11px] text-gray-600"><span className="font-semibold">Note:</span> {p.note}</p>}

        {/* Signatures */}
        <div className="grid grid-cols-3 items-end gap-4 border-t border-gray-200 pt-4 text-center text-[10px]">
          <div className="flex flex-col items-center">
            <SignatureImg src={ACCOUNTANT_SIGNATURE_SRC} alt="Accountant's signature" className="h-9 max-w-[130px]" />
            <div className="mt-1 w-full border-t border-gray-400 pt-1">
              <p className="font-bold uppercase text-gray-700">Prepared By</p>
              <p className="text-gray-500">Accountant{p.preparedBy ? ` · ${p.preparedBy}` : ''}</p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <SignatureImg src={DIRECTOR_SIGNATURE_SRC} alt="Director's signature" className="h-9 max-w-[130px]" />
            <div className="mt-1 w-full border-t border-gray-400 pt-1">
              <p className="font-bold uppercase text-gray-700">Approved By</p>
              <p className="text-gray-500">{DIRECTOR_NAME}, {DIRECTOR_TITLE}</p>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="h-9" />
            <div className="mt-1 w-full border-t border-gray-400 pt-1">
              <p className="font-bold uppercase text-gray-700">Received By</p>
              <p className="text-gray-500">Staff Signature</p>
            </div>
          </div>
        </div>
        <p className="text-center text-[9px] text-gray-400">
          This is a system-generated salary receipt of {INSTITUTE_NAME}. For queries contact the administration.
        </p>
      </div>
    </div>
  );
}

export function SalaryReceiptModal({ payment, onClose }: { payment: SalaryPayment; onClose: () => void }) {
  return (
    <div className="receipt-modal-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs">
      <div className="receipt-modal-card relative my-auto max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 print:hidden"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <SalaryReceiptSheet p={payment} />
        <div className="mt-5 flex justify-end gap-3 border-t border-gray-200 pt-3 print:hidden">
          <Button type="button" variant="outline" onClick={onClose} className="text-xs">
            Close
          </Button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:opacity-95"
          >
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
