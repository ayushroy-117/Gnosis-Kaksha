'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanLine } from 'lucide-react';

/**
 * Barcode scanner landing page for staff.
 *
 * A USB / Bluetooth barcode scanner behaves like a keyboard: it types the code
 * and presses Enter. This page keeps its box focused, so scanning an ID card
 * opens that person's profile with no clicks. (A phone camera scanning the QR
 * code opens the same profile page directly.)
 */
const STAFF_CODE = /^GK-(FAC|ACC|ADM)-[0-9A-F]{6}$/i;

export default function ScanPage() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => input.current?.focus(), []);

  const open = (raw: string) => {
    const code = raw.trim();
    if (!code) return;
    if (!/^[\x21-\x7e]{3,40}$/.test(code)) {
      setError('That does not look like a Gnosis Kaksha ID code. Scan again.');
      setValue('');
      return;
    }
    router.push(STAFF_CODE.test(code) ? `/verify/staff/${encodeURIComponent(code)}` : `/verify/${encodeURIComponent(code)}`);
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-[#CDE6F7] p-3 text-[#1295D8]">
            <ScanLine size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#1A2B4A]">Scan ID Card</h1>
            <p className="text-sm text-[#4A5568]">Point the barcode scanner at a student or staff ID card.</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            open(value);
          }}
        >
          <label htmlFor="scan-input" className="mb-1 block text-sm font-semibold text-[#1A2B4A]">
            Scanned code
          </label>
          <input
            id="scan-input"
            ref={input}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onBlur={() => setTimeout(() => input.current?.focus(), 50)}
            autoComplete="off"
            placeholder="Scan, or type the registration number and press Enter"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-base focus:border-[#1295D8] focus:outline-none focus:ring-2 focus:ring-[#1295D8]/20"
          />
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </form>

        <div className="mt-6 space-y-1.5 rounded-lg bg-[#F7FAFC] p-4 text-xs text-[#4A5568]">
          <p className="font-bold text-[#1A2B4A]">How the barcode works</p>
          <p>• Every ID card carries a Code 128 barcode of the registration number (staff: the staff ID).</p>
          <p>• It is active only while the person is current: students once their admission is approved, staff while employed.</p>
          <p>• Scanning opens the profile with the live status, so a resigned or unapproved card shows as NOT VALID.</p>
          <p>• Keep this page open and focused; the scanner types the code and presses Enter by itself.</p>
        </div>
      </div>
    </div>
  );
}
