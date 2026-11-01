'use client';

import { useState } from 'react';
import { User, Printer, ShieldCheck, Calendar, RotateCw, Scissors, Sparkles, Info } from 'lucide-react';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/student-data';
import { useStudentPortal } from '@/hooks/useStudentPortal';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Barcode } from '@/components/ui/Barcode';
import { apiFetch } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { HELPLINE_DISPLAY, INSTITUTE_ADDRESS_FULL, INSTITUTE_NAME, SITE_URL } from '@/lib/institute-contact';
import {
  CARD_PRINT_CSS,
  CardBottomStrip,
  CardHeader,
  DIRECTOR_SIGNATURE_SRC,
  GOLD_BAR,
  SignatureImg,
} from '@/components/id-card/parts';

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-[#718096]">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-[#1A2B4A]">{value}</dd>
    </div>
  );
}

/** Back-of-card instructions (text supplied by the institute). */
export const STUDENT_CARD_RULES = [
  'This identity card is the property of GNOSIS KAKSHA and must be presented upon request by authorized staff.',
  'The card is non-transferable. Impersonation, tampering, or misuse may result in disciplinary action.',
  'Students are expected to maintain at least 85% attendance in each enrolled subject and appear for all scheduled tests. Approved leave and genuine emergencies may be considered.',
  'Mobile phones and electronic devices must remain switched off or silent during classes. Use is permitted only with prior authorization.',
  "Monthly tuition fees must be paid on or before the 10th of each month. Applicable late fees will be governed by the institute's fee policy.",
  'Ragging, bullying, harassment, and deliberate damage to institute property are prohibited and may result in disciplinary action, including suspension or expulsion depending on the severity.',
  'Lost or damaged cards must be reported to the office immediately. A duplicate card will be issued subject to the applicable replacement fee.',
  'Students must follow their assigned batch timings and comply with all institute rules and instructions issued by the management.',
];

const CARD_H = 'h-[560px]';

export default function StudentProfilePage() {
  const { data, error, loading, reload, setData } = useStudentPortal();
  const { user } = useAuth();
  const [savingDoc, setSavingDoc] = useState<'photo' | 'signature' | null>(null);
  const [activeTab, setActiveTab] = useState<'both' | 'front' | 'back'>('both');
  const [isFlipped, setIsFlipped] = useState(false);

  if (loading && !data) return <LoadingState label="Loading profile…" />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return null;
  const { profile } = data;
  // The photo and signature are given once, on the admission form. Only the admin can replace them later.
  const canEditDocs = user?.role === 'admin';

  const saveDocument = async (kind: 'photo' | 'signature', dataUrl: string) => {
    setSavingDoc(kind);
    try {
      const res = await apiFetch<{ url: string }>(`/api/students/${profile.id}/documents/${kind}`, {
        method: 'PUT',
        json: { dataUrl },
      });
      setData((d) => (d ? { ...d, profile: { ...d.profile, [kind === 'photo' ? 'photoUrl' : 'signatureUrl']: res.url } } : d));
      toast.success(kind === 'photo' ? 'Photo updated.' : 'Signature updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setSavingDoc(null);
    }
  };

  // Only an approved (active) student gets a valid, printable ID card.
  const isActive = profile.enrollmentStatus === 'active';
  const statusBadge = isActive
    ? { tone: 'green' as const, label: 'Active Enrolled' }
    : profile.enrollmentStatus === 'pending'
      ? { tone: 'amber' as const, label: 'Admission pending' }
      : { tone: 'red' as const, label: 'Not approved' };

  const showFront = activeTab !== 'back';
  const showBack = activeTab !== 'front';

  return (
    <div className="space-y-8">
      {/* ── Page Header (hidden on print) ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1A2B4A]">Student Profile &amp; ID Card</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[#1295D8]">
              <Sparkles size={12} /> Official PVC Badge
            </span>
          </div>
          <p className="mt-1 text-sm text-[#4A5568]">
            Official institutional identity, academic enrollment, and printable two-sided student ID badge.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => window.print()}
          disabled={!isActive}
          title={isActive ? undefined : 'Your ID card can be printed once your admission is approved'}
          className="gap-2 bg-gradient-to-r from-[#1295D8] to-[#2E5EAA] text-white shadow-md transition-all hover:shadow-lg"
        >
          <Printer size={16} /> Print / Save ID Card (PDF)
        </Button>
      </div>

      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 print:hidden">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-lg bg-[#1295D8] p-2 text-white">
            <Info size={18} />
          </div>
          <div className="flex-1 text-xs leading-relaxed text-[#2D3748]">
            <p className="mb-0.5 text-sm font-bold text-[#1A2B4A]">Print &amp; PDF Instructions</p>
            Printing lays the front and back side by side on one <strong>A4</strong> sheet with cut guidelines. In your
            browser&apos;s print dialog, tick <u>&quot;Background graphics&quot;</u> so the colours print.
            <span className="mt-1 block font-semibold text-[#1E3A8A]">
              The barcode and QR code on the front identify this student: staff scan them to open this profile.
            </span>
          </div>
        </div>
      </div>

      {/* ═════════ ID CARD SHOWCASE ═════════ */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm print:m-0 print:border-none print:p-0 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#1A2B4A]">Digital ID Card Preview</h2>
            {isActive ? (
              <Badge tone="green">Verified 2026–2027</Badge>
            ) : (
              <Badge tone="amber">Preview only — not valid until admission is approved</Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-semibold">
              {(
                [
                  ['both', 'Side-by-Side View'],
                  ['front', 'Front Side'],
                  ['back', 'Back Side'],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setIsFlipped(tab === 'back');
                  }}
                  className={`rounded-md px-3 py-1.5 transition-colors ${
                    activeTab === tab ? 'bg-white text-[#1295D8] shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsFlipped(!isFlipped);
                setActiveTab(isFlipped ? 'front' : 'back');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 md:hidden"
            >
              <RotateCw size={14} /> Flip Card
            </button>
          </div>
        </div>

        <div className="mb-4 hidden text-center print:block">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#1A2B4A]">
            Gnosis Kaksha — Official Student Identity Card Sheet (Session 2026–2027)
          </p>
          <p className="mt-0.5 text-[8px] text-gray-500">Cut along the dashed lines · fold or insert back-to-back in a PVC holder</p>
        </div>

        <div
          id="id-card-printable-area"
          className="id-card-sheet flex flex-col items-center justify-center gap-8 lg:flex-row lg:items-start lg:gap-10"
        >
          {/* ══ FRONT ══ */}
          {showFront && (
            <div
              data-testid="id-card-front"
              className={`id-card-element relative flex w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ${CARD_H}`}
            >
              <div className="absolute left-1/2 top-2 z-20 h-2 w-10 -translate-x-1/2 rounded-full border border-gray-300/60 bg-gray-200/80 print:hidden" />
              <CardHeader badge="2026–27" />
              <div className={`h-[3.5px] ${GOLD_BAR}`} />

              <div className="relative z-10 flex flex-1 flex-col justify-between bg-gradient-to-b from-white to-[#F8FAFC] p-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <div className="relative flex h-[118px] w-[94px] flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-[#1295D8] bg-blue-50/60 p-0.5 shadow-sm">
                      {profile.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- auth-gated API image
                        <img src={profile.photoUrl} alt={profile.fullName} className="h-full w-full rounded-md object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-[#1295D8]">
                          <User size={40} strokeWidth={1.5} />
                          <span className="mt-1 text-[8px] font-extrabold tracking-widest text-slate-500">PHOTO</span>
                        </div>
                      )}
                    </div>
                    <span className="inline-block rounded-full bg-[#1E293B] px-2.5 py-0.5 text-[8.5px] font-black tracking-wider text-amber-300">
                      CLASS {profile.classNumber} {profile.board ? `• ${profile.board}` : ''}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5 text-left">
                    <CardField label="Student Name" value={profile.fullName} big />
                    <CardField label="Registration No." value={profile.registrationNumber} mono />
                    <CardField label="Father's / Guardian Name" value={profile.parentName || '—'} />
                    <CardField label="Contact Number" value={`+91 ${profile.mobile}`} />
                    <CardField label="Branch" value={profile.branchName || '—'} />
                    <CardField label="Permanent Address" value={profile.address || '—'} small />
                  </div>
                </div>

                {isActive ? (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/90 px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className="shrink-0 text-emerald-600" />
                      <span className="text-[8.5px] font-extrabold uppercase tracking-wide text-emerald-800">
                        Verified Active Student • 2026–2027
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[7px] font-bold uppercase text-white">Valid</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5">
                    <span className="text-[8.5px] font-extrabold uppercase tracking-wide text-amber-800">
                      {profile.enrollmentStatus === 'pending' ? 'Admission pending verification' : 'Admission not approved'}
                    </span>
                    <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[7px] font-bold uppercase text-white">Not valid</span>
                  </div>
                )}

                <div className="text-center" data-testid="student-barcode">
                  <Barcode value={profile.registrationNumber} width={250} height={40} />
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
                    <div className="rounded-md border border-slate-300 bg-white p-1" data-testid="student-qr">
                      <QRCodeSVG value={`${SITE_URL}/verify/${encodeURIComponent(profile.registrationNumber)}`} size={52} level="M" fgColor="#0F172A" />
                    </div>
                    <span className="text-[6.5px] font-semibold uppercase tracking-tighter text-slate-500">Scan to Verify</span>
                  </div>
                </div>
              </div>
              <CardBottomStrip />
            </div>
          )}

          {/* ══ BACK ══ */}
          {showBack && (
            <div
              data-testid="id-card-back"
              className={`id-card-element relative flex w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ${CARD_H}`}
            >
              <div className="absolute left-1/2 top-2 z-20 h-2 w-10 -translate-x-1/2 rounded-full border border-gray-300/60 bg-gray-200/80 print:hidden" />
              <div className="relative z-10 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1E3A8A] px-4 pb-3 pt-5 text-center text-white">
                <h4 className="text-xs font-black uppercase tracking-widest">RULES &amp; CODE OF CONDUCT</h4>
                <p className="mt-0.5 text-[8px] font-semibold tracking-wider text-sky-200">{INSTITUTE_NAME} | STUDENT IDENTITY CARD</p>
              </div>
              <div className={`h-[3px] ${GOLD_BAR}`} />

              <div className="relative z-10 flex flex-1 flex-col justify-between bg-white p-3.5">
                <ol className="space-y-1.5">
                  {STUDENT_CARD_RULES.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#1295D8] text-[7px] font-bold text-white">
                        {idx + 1}
                      </span>
                      <p className="text-[8px] leading-tight text-slate-700">{rule}</p>
                    </li>
                  ))}
                </ol>

                <div className="rounded-lg border border-amber-300 bg-amber-50/90 p-2 text-center">
                  <p className="text-[8px] font-bold leading-tight text-amber-900">IF FOUND, PLEASE RETURN THIS CARD TO: {INSTITUTE_NAME}</p>
                  <p className="mt-0.5 text-[7.5px] font-semibold leading-tight text-amber-800">{INSTITUTE_ADDRESS_FULL}</p>
                  <p className="mt-0.5 font-mono text-[7px] leading-tight text-amber-700">
                    Phone: +91 {HELPLINE_DISPLAY.replace(/(\d{5})(\d{5})/, '$1 $2')} · website: {SITE_URL.replace(/^https?:\/\//, 'www.')}
                  </p>
                </div>

                <div className="grid grid-cols-2 items-end gap-x-3 gap-y-1.5 border-t border-slate-200 pt-2 text-[7.5px]">
                  <div className="flex flex-col items-center">
                    <SignatureImg src={profile.signatureUrl || ''} alt="Student's signature" className="h-[26px] max-w-[110px]" />
                    <div className="w-full border-t border-slate-400 pt-0.5 text-center font-bold uppercase tracking-wider text-slate-700">
                      Student&apos;s Signature
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p>
                      <span className="font-bold uppercase text-slate-400">Validity: </span>
                      <span className="font-bold text-emerald-700">31-Mar-2027</span>
                    </p>
                    <p>
                      <span className="font-bold uppercase text-slate-400">Reg. No.: </span>
                      <span className="font-mono font-bold text-[#1295D8]">{profile.registrationNumber}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 flex items-center justify-between bg-[#0F172A] px-3.5 py-2 text-[7.5px] text-slate-300">
                <span className="flex items-center gap-1">
                  <Calendar size={9} className="text-amber-400" /> Session: 2026–27
                </span>
                <span className="font-bold text-amber-400">Official Academic Document</span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 print:hidden">
          <Button
            type="button"
            onClick={() => window.print()}
            disabled={!isActive}
            title={isActive ? undefined : 'Your ID card can be printed once your admission is approved'}
            className="gap-2 bg-[#1A2B4A] text-white shadow-sm hover:bg-[#1295D8]"
          >
            <Printer size={15} /> Print ID Card (Both Sides)
          </Button>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Scissors size={14} className="text-gray-400" /> Ready to print on A4 sheet with cut guidelines
          </span>
        </div>
      </div>

      {/* ═════════ PROFILE DETAILS ═════════ */}
      <div className="space-y-6 print:hidden">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div
            data-testid="profile-photo"
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#CDE6F7] text-[#1295D8] shadow-sm"
          >
            {profile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- auth-gated API image
              <img src={profile.photoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
            ) : (
              <User size={40} />
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-2xl font-bold text-[#1A2B4A]">{profile.fullName}</h2>
              <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
              <Badge tone="blue">Class {profile.classNumber}</Badge>
            </div>
            <p className="mt-1 font-mono text-sm font-semibold text-[#1295D8]">Registration No: {profile.registrationNumber}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              {profile.stream && <Badge tone="gray">{profile.stream}</Badge>}
              <Badge tone="gray">{profile.board} Board</Badge>
              {profile.branchName && <Badge tone="gray">{profile.branchName}</Badge>}
              <span className="self-center text-xs text-gray-500">Admitted on: {formatDate(profile.admissionDate)}</span>
            </div>
          </div>
        </div>

        {canEditDocs && (
          <SectionCard title="Photo & Signature (admin only)" description="Students give these once on the admission form. Only the admin can replace them.">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <ImageUpload kind="photo" label="Photo" value={profile.photoUrl} onChange={(d) => saveDocument('photo', d)} busy={savingDoc === 'photo'} />
              <ImageUpload kind="signature" label="Signature" value={profile.signatureUrl} onChange={(d) => saveDocument('signature', d)} busy={savingDoc === 'signature'} />
            </div>
          </SectionCard>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SectionCard title="Academic & Enrollment Details">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProfileField label="Full Name" value={profile.fullName} />
              <ProfileField label="Registration Number" value={profile.registrationNumber} />
              <ProfileField label="Branch" value={profile.branchName || '—'} />
              <ProfileField label="Class Level" value={`Class ${profile.classNumber}`} />
              <ProfileField label="Stream / Course" value={profile.stream ?? 'General'} />
              <ProfileField label="Academic Board" value={profile.board} />
              <ProfileField label="Admission Date" value={formatDate(profile.admissionDate)} />
            </dl>
          </SectionCard>

          <SectionCard title="Contact & Guardian Information">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProfileField label="Student Mobile" value={profile.mobile} />
              <ProfileField label="Student Email" value={profile.email} />
              <ProfileField label="Father / Guardian" value={profile.parentName} />
              <ProfileField label="Emergency Contact" value={profile.guardianMobile} />
              <div className="sm:col-span-2">
                <ProfileField label="Permanent Residential Address" value={profile.address} />
              </div>
            </dl>
          </SectionCard>
        </div>
      </div>

      <style jsx global>{CARD_PRINT_CSS}</style>
    </div>
  );
}

function CardField({ label, value, big, mono, small }: { label: string; value: string; big?: boolean; mono?: boolean; small?: boolean }) {
  return (
    <div>
      <p className="text-[7.5px] font-bold uppercase leading-none tracking-wider text-slate-400">{label}</p>
      <p
        className={`mt-0.5 leading-tight ${
          big ? 'truncate text-[13px] font-black text-[#0F172A]' : mono ? 'font-mono text-[11px] font-bold text-[#1295D8]' : small ? 'line-clamp-2 text-[9px] font-medium text-slate-600' : 'line-clamp-2 text-[10px] font-semibold text-slate-800'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
