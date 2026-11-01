'use client';

import { useState } from 'react';
import {
  HELPLINE_DISPLAY,
  INSTITUTE_ADDRESS_SHORT,
  INSTITUTE_NAME,
  INSTITUTE_TAGLINE,
  SITE_URL,
} from '@/lib/institute-contact';

/**
 * Pieces shared by the student and staff ID cards.
 * Assets the institute supplies (drop into /public):
 *   /logo-white.png            white logo, transparent background (falls back to /logo.png)
 *   /signatures/director.png   director's signature (printed on the front, as authorised signatory)
 */

/** White logo on the dark card header; falls back to the regular logo until the white one is added. */
export function BrandLogo({ size = 64 }: { size?: number }) {
  const [src, setSrc] = useState('/logo-white.png');
  // eslint-disable-next-line @next/next/no-img-element -- static brand asset, onError fallback needs a plain img
  return <img src={src} alt="Gnosis Kaksha" width={size} height={size} style={{ width: size, height: size }} className="shrink-0 object-contain" onError={() => setSrc('/logo.png')} />;
}

/** A signature image that simply stays blank (just the line below it) if the file isn't there yet. */
export function SignatureImg({ src, alt, className = 'h-[26px] max-w-[110px]' }: { src: string; alt: string; className?: string }) {
  const [ok, setOk] = useState(true);
  // eslint-disable-next-line @next/next/no-img-element -- auth-gated API image or static asset
  return ok && src ? <img src={src} alt={alt} className={`${className} object-contain`} onError={() => setOk(false)} /> : <span className={className} />;
}

export const DIRECTOR_SIGNATURE_SRC = '/signatures/director.png';

/** Dark header: white logo (large), name, tagline, location. */
export function CardHeader({ badge, subtitle }: { badge: string; subtitle?: string }) {
  return (
    <div className="relative z-10 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#1E3A8A] px-4 pt-5 pb-3 text-white">
      <div className="flex items-center gap-3">
        <BrandLogo size={68} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[17px] font-black leading-tight tracking-wider text-white">{INSTITUTE_NAME}</h3>
            <span className="shrink-0 rounded bg-amber-400 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[#0F172A]">
              {badge}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-300">{INSTITUTE_TAGLINE}</p>
          <p className="mt-0.5 text-[8px] leading-tight text-slate-300">{subtitle ?? INSTITUTE_ADDRESS_SHORT}</p>
        </div>
      </div>
    </div>
  );
}

export const GOLD_BAR = 'bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500';

export function CardBottomStrip({ left }: { left?: string }) {
  return (
    <div className="relative z-10 flex items-center justify-between bg-[#0F172A] px-3 py-1.5 text-[7.5px] text-slate-300">
      <span>{left ?? `web: ${SITE_URL.replace(/^https?:\/\//, '')}`}</span>
      <span>helpline: {HELPLINE_DISPLAY}</span>
    </div>
  );
}

/** Print rules shared by both card pages: two cards side by side on one A4. */
export const CARD_PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 10mm 8mm; }
  *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  nav, header, aside, footer, .print\:hidden, button, [role="navigation"] { display: none !important; }
  .id-card-sheet { display: flex !important; flex-direction: row !important; align-items: flex-start !important; justify-content: center !important; gap: 10mm !important; width: 100% !important; margin: 0 auto !important; padding-top: 5mm !important; break-inside: avoid !important; }
  .id-card-element { display: flex !important; width: 85.6mm !important; max-width: 85.6mm !important; height: 135mm !important; border: 1.5px dashed #94a3b8 !important; border-radius: 4mm !important; overflow: hidden !important; break-inside: avoid !important; box-shadow: none !important; background: #fff !important; }
}`;
