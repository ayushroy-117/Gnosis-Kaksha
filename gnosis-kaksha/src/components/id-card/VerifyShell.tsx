import Image from 'next/image';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export type VerifyTone = 'ok' | 'warn' | 'bad';

const TONES: Record<VerifyTone, { box: string; icon: React.ReactNode }> = {
  ok: { box: 'border-emerald-300 bg-emerald-50 text-emerald-800', icon: <CheckCircle2 size={28} /> },
  warn: { box: 'border-amber-300 bg-amber-50 text-amber-800', icon: <AlertTriangle size={28} /> },
  bad: { box: 'border-red-300 bg-red-50 text-red-800', icon: <XCircle size={28} /> },
};

/** Public page frame for the result of scanning an ID-card or receipt QR code. */
export function VerifyShell({
  kind,
  tone,
  statusLabel,
  children,
}: {
  kind: string;
  tone: VerifyTone;
  statusLabel: string;
  children?: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-10">
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="Gnosis Kaksha" width={48} height={48} className="h-12 w-12 object-contain" />
        <div>
          <p className="text-lg font-black tracking-wide text-[#1A2B4A]">GNOSIS KAKSHA</p>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1295D8]">{kind}</p>
        </div>
      </div>
      <div className={`flex items-center gap-3 rounded-xl border-2 p-4 ${t.box}`} data-testid="verify-status" data-tone={tone}>
        {t.icon}
        <p className="text-xl font-extrabold">{statusLabel}</p>
      </div>
      {children && <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">{children}</div>}
    </div>
  );
}

export function VerifyRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#718096]">{label}</p>
      <p className="text-sm font-semibold text-[#1A2B4A]">{value || '—'}</p>
    </div>
  );
}
