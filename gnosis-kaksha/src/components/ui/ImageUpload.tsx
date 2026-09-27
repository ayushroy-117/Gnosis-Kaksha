'use client';

import { useRef, useState } from 'react';
import { ImagePlus, RefreshCw } from 'lucide-react';

type Kind = 'photo' | 'signature';

// Target sizes: a passport-style photo and a wide signature strip. Images are
// re-encoded as JPEG in the browser, so a 5 MB phone photo uploads as ~100 KB.
const TARGET: Record<Kind, { maxW: number; maxH: number; quality: number }> = {
  photo: { maxW: 600, maxH: 750, quality: 0.85 },
  signature: { maxW: 700, maxH: 250, quality: 0.9 },
};
const MAX_INPUT_BYTES = 15 * 1024 * 1024;

/** Resize + re-encode an image file to a JPEG data URL (white background). */
export async function compressImage(file: File, kind: Kind): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPG or PNG).');
  if (file.size > MAX_INPUT_BYTES) throw new Error('That image is larger than 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('That image could not be opened. Try a JPG or PNG.'));
      el.src = url;
    });
    const { maxW, maxH, quality } = TARGET[kind];
    const scale = Math.min(1, maxW / img.width, maxH / img.height);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not process the image.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface ImageUploadProps {
  kind: Kind;
  label: string;
  hint?: string;
  /** Current image: a data URL or an API URL. */
  value: string | null | undefined;
  onChange: (dataUrl: string) => void | Promise<void>;
  error?: string;
  disabled?: boolean;
  busy?: boolean;
}

/** Pick, preview and compress a student photo or signature. */
export function ImageUpload({ kind, label, hint, value, onChange, error, disabled, busy }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const shownError = localError ?? error;
  const box = kind === 'photo' ? 'h-32 w-[104px]' : 'h-20 w-56';

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setLocalError(null);
    setProcessing(true);
    try {
      await onChange(await compressImage(file, kind));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not use that image.');
    } finally {
      setProcessing(false);
    }
  };

  const working = processing || busy;

  return (
    <div>
      <p className="mb-2 block text-base font-medium text-[#4A5568]">{label}</p>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || working}
          aria-label={value ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          className={`${box} flex shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-gray-50 transition hover:border-[#1295D8] hover:bg-[#F0F7FD] disabled:cursor-not-allowed disabled:opacity-60 ${
            shownError ? 'border-red-400' : 'border-gray-300'
          }`}
        >
          {working ? (
            <span className="h-7 w-7 animate-spin rounded-full border-4 border-[#1295D8] border-t-transparent" />
          ) : value ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL / auth-gated API image
            <img src={value} alt={label} className={`h-full w-full ${kind === 'photo' ? 'object-cover' : 'object-contain'}`} />
          ) : (
            <ImagePlus size={26} className="text-[#1295D8]" />
          )}
        </button>
        <div className="min-w-0 flex-1 space-y-1 text-xs text-[#718096]">
          {hint && <p>{hint}</p>}
          {!disabled && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={working}
              className="inline-flex items-center gap-1 font-semibold text-[#1295D8] hover:underline disabled:opacity-50"
            >
              {value ? <><RefreshCw size={12} /> Replace</> : <><ImagePlus size={12} /> Choose image</>}
            </button>
          )}
        </div>
      </div>
      {shownError && <p className="mt-1 text-sm text-red-600">{shownError}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
