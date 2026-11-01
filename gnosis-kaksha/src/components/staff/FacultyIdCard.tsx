'use client';

import { useState } from 'react';
import { User, Printer, Calendar, RotateCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Badge } from '@/components/dashboard/Badge';
import { Button } from '@/components/ui/Button';
import { Barcode } from '@/components/ui/Barcode';
import { formatDate } from '@/lib/format';
import { HELPLINE_DISPLAY, INSTITUTE_ADDRESS_SHORT, INSTITUTE_NAME, SITE_URL } from '@/lib/institute-contact';
import {
  CARD_PRINT_CSS,
  CardBottomStrip,
  CardHeader,
  DIRECTOR_SIGNATURE_SRC,
  GOLD_BAR,
  SignatureImg,
} from '@/components/id-card/parts';
import type { StaffProfile } from '@/lib/server/staff';

/** Back-of-card instructions (text supplied by the institute). */
export const STAFF_CARD_RULES = [
  'This card is the official institutional property of Gnosis Kaksha and must be worn or carried within the campus.',
  'This card serves as authorized faculty identification for academic batches, evaluations, and official meetings.',
  'In case of card loss or damage, immediately notify the Administration Office for a reissue.',
  'Faculty members are expected to uphold the highest standards of academic excellence and professional ethics.',
  'This card is non-transferable and must not be used by any other person.',
  'The card must be surrendered to the Administration upon resignation, termination, or cessation of employment.',
  'Any unauthorized use, alteration, or misuse of this card may result in disciplinary action.',
];

const CARD_H = 'h-[580px]';

function CardRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-[7.5px] font-bold uppercase leading-none tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 line-clamp-2 text-[9.5px] font-semibold leading-tight text-slate-800">{value || '—'}</p>
    </div>
  );
}

/** Two-sided faculty ID card with print support. */
export function FacultyIdCard({ p, status }: { p: StaffProfile; status: { tone: 'green' | 'amber' | 'red'; label: string } }) {
  const [side, setSide] = useState<'both' | 'front' | 'back'>('both');
  return (
    <>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:m-0 print:border-none print:p-0 print:shadow-none">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4 print:hidden">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#1A2B4A]">Faculty ID Card</h2>
              <Badge tone={status.tone}>{status.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-semibold">
                {(['both', 'front', 'back'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={`rounded-md px-3 py-1.5 capitalize ${side === s ? 'bg-white text-[#1295D8] shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {s === 'both' ? 'Side-by-Side View' : `${s} Side`}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSide(side === 'back' ? 'front' : 'back')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 md:hidden"
              >
                <RotateCw size={14} /> Flip Card
              </button>
              <Button
                type="button"
                onClick={() => window.print()}
                disabled={p.employmentStatus !== 'active'}
                className="gap-2 bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] text-white"
              >
                <Printer size={16} /> Print Faculty ID Card (PDF)
              </Button>
            </div>
          </div>

          <div className="id-card-sheet flex flex-col items-center justify-center gap-8 lg:flex-row lg:items-start lg:gap-10">
            {/* ══ FRONT ══ */}
            {side !== 'back' && (
              <div
                data-testid="staff-card-front"
                className={`id-card-element relative flex w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ${CARD_H}`}
              >
                <CardHeader badge="FACULTY" />
                <div className={`h-[3.5px] ${GOLD_BAR}`} />

                <div className="relative z-10 flex flex-1 flex-col justify-between bg-gradient-to-b from-white to-[#F8FAFC] p-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex shrink-0 flex-col items-center gap-1.5">
                      <div className="flex h-[118px] w-[94px] items-center justify-center overflow-hidden rounded-lg border-2 border-[#1E3A8A] bg-blue-50/60 p-0.5 shadow-sm">
                        {p.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- auth-gated API image
                          <img src={p.photoUrl} alt={p.fullName} className="h-full w-full rounded-md object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-[#1E3A8A]">
                            <User size={40} strokeWidth={1.5} />
                            <span className="mt-1 text-[8px] font-extrabold tracking-widest text-slate-500">PHOTO</span>
                          </div>
                        )}
                      </div>
                      <span className="rounded-full bg-[#1E293B] px-2.5 py-0.5 text-[8px] font-black tracking-wider text-amber-300">{p.staffCode}</span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5 text-left">
                      <div>
                        <p className="text-[7.5px] font-bold uppercase leading-none tracking-wider text-slate-400">Faculty Name</p>
                        <p className="mt-0.5 truncate text-[13px] font-black leading-tight text-[#0F172A]">{p.fullName}</p>
                      </div>
                      <div>
                        <p className="text-[7.5px] font-bold uppercase leading-none tracking-wider text-slate-400">Designation</p>
                        <p className="mt-0.5 text-[10px] font-bold leading-tight text-[#1295D8]">{p.designation}</p>
                      </div>
                      <CardRow label="Email" value={p.email} />
                      <CardRow label="Contact No." value={p.phone ? `+91 ${p.phone}` : null} />
                      <CardRow label="Father's Name" value={p.fatherName} />
                      <CardRow label="Address" value={p.address} />
                      <CardRow label="Date of Joining" value={p.dateOfJoining ? formatDate(p.dateOfJoining) : null} />
                    </div>
                  </div>

                  <div className="text-center" data-testid="staff-barcode">
                    <Barcode value={p.staffCode} width={250} height={38} />
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="flex flex-col items-center">
                      <SignatureImg src={DIRECTOR_SIGNATURE_SRC} alt="Director's signature" />
                      <div className="mt-0.5 w-32 border-t border-slate-400 pt-0.5 text-center">
                        <p className="text-[7.5px] font-bold uppercase leading-none tracking-wider text-slate-700">Authorized Signatory</p>
                        <p className="mt-0.5 text-[6.5px] font-medium leading-none text-slate-500">Director, {INSTITUTE_NAME}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="rounded-md border border-slate-300 bg-white p-1" data-testid="staff-qr">
                        <QRCodeSVG value={`${SITE_URL}/verify/staff/${p.staffCode}`} size={52} level="M" fgColor="#0F172A" />
                      </div>
                      <span className="text-[6.5px] font-semibold uppercase tracking-tighter text-slate-500">Scan to Verify</span>
                    </div>
                  </div>
                </div>
                <CardBottomStrip />
              </div>
            )}

            {/* ══ BACK ══ */}
            {side !== 'front' && (
              <div
                data-testid="staff-card-back"
                className={`id-card-element relative flex w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ${CARD_H}`}
              >
                <div className="relative z-10 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1E3A8A] px-4 pb-3 pt-5 text-center text-white">
                  <h4 className="text-xs font-black uppercase tracking-widest">Instructions</h4>
                  <p className="mt-0.5 text-[8px] font-semibold tracking-wider text-sky-200">{INSTITUTE_NAME} | OFFICIAL FACULTY CARD</p>
                </div>
                <div className={`h-[3px] ${GOLD_BAR}`} />

                <div className="relative z-10 flex flex-1 flex-col justify-between bg-white p-3.5">
                  <ol className="space-y-1.5">
                    {STAFF_CARD_RULES.map((rule, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#1E3A8A] text-[7px] font-bold text-white">
                          {i + 1}
                        </span>
                        <p className="text-[8px] leading-tight text-slate-700">{rule}</p>
                      </li>
                    ))}
                  </ol>

                  <div className="rounded-lg border border-amber-300 bg-amber-50/90 p-2 text-center">
                    <p className="text-[8px] font-bold leading-tight text-amber-900">Helpline: {HELPLINE_DISPLAY}</p>
                    <p className="mt-0.5 text-[7.5px] font-semibold leading-tight text-amber-800">{INSTITUTE_ADDRESS_SHORT}</p>
                  </div>

                  <div className="flex flex-col items-center border-t border-slate-200 pt-2">
                    <p
                      data-testid="cardholder-signature"
                      className="text-[22px] leading-none text-[#1E3A8A]"
                      style={{ fontFamily: "'Segoe Script', 'Brush Script MT', 'Lucida Handwriting', cursive", fontStyle: 'italic' }}
                    >
                      {p.fullName}
                    </p>
                    <div className="mt-1 w-40 border-t border-slate-400 pt-0.5 text-center text-[7.5px] font-bold uppercase tracking-wider text-slate-700">
                      Cardholder&apos;s Signature
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between bg-[#0F172A] px-3.5 py-2 text-[7.5px] text-slate-300">
                  <span className="flex items-center gap-1">
                    <Calendar size={9} className="text-amber-400" /> Academic Year: 2026–2027
                  </span>
                  <span className="font-bold text-amber-400">Official Staff Credential</span>
                </div>
              </div>
            )}
          </div>
        </div>
      <style jsx global>{CARD_PRINT_CSS}</style>
    </>
  );
}
