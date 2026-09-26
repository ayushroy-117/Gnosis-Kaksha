'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { CheckCircle2, ImageUp, QrCode, Save, ScanLine, AlertTriangle, PencilLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiFetch, useApi } from '@/hooks/useApi';
import { parseUpiQr, upiPayUrl, VPA_PATTERN, type UpiPayee } from '@/lib/upi';
import { formatDate } from '@/lib/format';

interface PaymentSettings extends UpiPayee {
  configured: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Read the QR code out of an image file, in the browser (nothing is uploaded). */
async function decodeQrFromFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not open that image.'));
      el.src = url;
    });
    // Try the image at a few sizes: phone screenshots are large, and jsQR does
    // best when the code is a few hundred pixels wide.
    for (const maxSide of [1600, 1000, 700, 2400]) {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const result = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' });
      if (result?.data) return result.data;
    }
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function AdminPaymentSettingsPage() {
  const { data, error, loading, reload } = useApi<PaymentSettings>('/api/admin/settings/payment');
  const [candidate, setCandidate] = useState<UpiPayee | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [manual, setManual] = useState({ upiId: '', payeeName: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    setDecodeError(null);
    setCandidate(null);
    if (!file.type.startsWith('image/')) {
      setDecodeError('Choose an image (PNG, JPG or screenshot) of the QR code.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setDecodeError('That image is larger than 10 MB.');
      return;
    }
    setPreview(URL.createObjectURL(file));
    setDecoding(true);
    try {
      const text = await decodeQrFromFile(file);
      if (!text) {
        setDecodeError('No QR code could be read from this image. Crop the screenshot closer to the QR, or enter the UPI ID manually below.');
        return;
      }
      const payee = parseUpiQr(text);
      if (!payee) {
        setDecodeError('This QR code is not a UPI payment code. Use the QR from your bank / UPI business app.');
        return;
      }
      setCandidate(payee);
    } catch (err) {
      setDecodeError(err instanceof Error ? err.message : 'Could not read that image.');
    } finally {
      setDecoding(false);
    }
  };

  // Paste a screenshot straight from the clipboard (Ctrl+V anywhere on the page)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'));
      if (item) {
        e.preventDefault();
        handleFile(item.getAsFile());
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const save = async (payee: UpiPayee) => {
    setSaving(true);
    try {
      await apiFetch('/api/admin/settings/payment', { method: 'PUT', json: payee });
      toast.success(`Payments will now go to ${payee.upiId}.`);
      setCandidate(null);
      setPreview(null);
      setManual({ upiId: '', payeeName: '' });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const saveManual = (e: React.FormEvent) => {
    e.preventDefault();
    const upiId = manual.upiId.trim();
    if (!VPA_PATTERN.test(upiId)) {
      toast.error('That is not a valid UPI ID (it should look like name@bank).');
      return;
    }
    save({ upiId, payeeName: manual.payeeName.trim() || 'Gnosis Kaksha', extraParams: {} });
  };

  if (loading && !data) return <LoadingState label="Loading payment settings…" />;
  if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return null;

  const current = data;
  const changed = candidate && candidate.upiId.toLowerCase() !== current.upiId.toLowerCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Payment Settings</h1>
        <p className="mt-1 text-[#4A5568]">
          The UPI account students pay into. Upload a screenshot of the institute&apos;s UPI QR code and every payment
          QR in the app (admission form and student fees) will use it, with the exact amount filled in.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Current payee */}
        <SectionCard title="Current payee" className="lg:col-span-2">
          <div className="space-y-4">
            {!current.configured && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>Not set yet — payments currently use the built-in default <span className="font-mono">{current.upiId}</span>. Upload your QR to fix this.</span>
              </div>
            )}
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#718096]">UPI ID</dt>
                <dd className="break-all text-right font-mono font-semibold text-[#1A2B4A]">{current.upiId}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#718096]">Payee name</dt>
                <dd className="text-right font-semibold text-[#1A2B4A]">{current.payeeName}</dd>
              </div>
              {current.updatedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-[#718096]">Last changed</dt>
                  <dd className="text-right text-[#4A5568]">
                    {formatDate(current.updatedAt.slice(0, 10))}
                    {current.updatedBy && <span className="block text-xs text-[#718096]">{current.updatedBy}</span>}
                  </dd>
                </div>
              )}
            </dl>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="rounded-lg bg-white p-2">
                <QRCodeSVG value={upiPayUrl({ payee: current, amount: 1, note: 'Gnosis Kaksha QR test' })} size={150} level="M" />
              </div>
              <p className="text-center text-xs text-[#718096]">
                Test QR for ₹1. Scan it with a UPI app and check the payee name — you don&apos;t need to pay.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Upload */}
        <div className="space-y-6 lg:col-span-3">
          <SectionCard title="Upload a new QR code" description="From your bank or UPI business app (PhonePe, GPay, Paytm for Business…)">
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                  dragOver ? 'border-[#1295D8] bg-[#F0F7FD]' : 'border-gray-300 bg-gray-50 hover:border-[#1295D8] hover:bg-[#F0F7FD]'
                }`}
              >
                {decoding ? (
                  <span className="h-8 w-8 animate-spin rounded-full border-4 border-[#1295D8] border-t-transparent" />
                ) : (
                  <ImageUp size={30} className="text-[#1295D8]" />
                )}
                <span className="text-sm font-semibold text-[#1A2B4A]">
                  {decoding ? 'Reading QR code…' : 'Click to choose a screenshot, drop it here, or press Ctrl+V to paste'}
                </span>
                <span className="text-xs text-[#718096]">PNG or JPG. The image is read in your browser and never uploaded.</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
              />

              {decodeError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{decodeError}</span>
                </div>
              )}

              {candidate && (
                <div className="flex flex-col gap-4 rounded-xl border border-green-200 bg-green-50 p-4 sm:flex-row">
                  {preview && (
                    // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                    <img src={preview} alt="Uploaded QR screenshot" className="h-36 w-36 shrink-0 self-center rounded-lg border border-green-200 bg-white object-contain" />
                  )}
                  <div className="min-w-0 flex-1 space-y-3">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-green-800">
                      <CheckCircle2 size={16} /> UPI QR code found
                    </p>
                    <div className="text-sm">
                      <p className="text-xs text-[#718096]">UPI ID</p>
                      <p className="break-all font-mono font-bold text-[#1A2B4A]">{candidate.upiId}</p>
                    </div>
                    <Input
                      label="Payee name (as students will see it)"
                      value={candidate.payeeName}
                      onChange={(e) => setCandidate({ ...candidate, payeeName: e.target.value })}
                    />
                    {Object.keys(candidate.extraParams).length > 0 && (
                      <p className="text-xs text-[#718096]">
                        Merchant details kept: {Object.entries(candidate.extraParams).map(([k, v]) => `${k}=${v}`).join(', ')}
                      </p>
                    )}
                    {!changed && <Badge tone="gray">Same UPI ID as the current one</Badge>}
                    <div className="flex flex-wrap gap-3">
                      <Button type="button" variant="primary" isLoading={saving} onClick={() => save(candidate)}>
                        <Save size={16} /> Use this for all payments
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setCandidate(null); setPreview(null); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <ul className="space-y-1 text-xs text-[#718096]">
                <li className="flex gap-1.5"><ScanLine size={13} className="mt-0.5 shrink-0" /> Use the QR for receiving money into the institute&apos;s account — not a personal payment QR.</li>
                <li className="flex gap-1.5"><QrCode size={13} className="mt-0.5 shrink-0" /> Students still get a QR with their exact amount and reference, generated from this UPI ID.</li>
              </ul>
            </div>
          </SectionCard>

          <SectionCard title="Or enter the UPI ID manually" description="If the screenshot can't be read">
            <form onSubmit={saveManual} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="UPI ID"
                placeholder="e.g. gnosiskaksha@okaxis"
                value={manual.upiId}
                onChange={(e) => setManual((m) => ({ ...m, upiId: e.target.value }))}
                autoComplete="off"
                required
              />
              <Input
                label="Payee name"
                placeholder="Gnosis Kaksha"
                value={manual.payeeName}
                onChange={(e) => setManual((m) => ({ ...m, payeeName: e.target.value }))}
              />
              <div className="sm:col-span-2">
                <Button type="submit" variant="outline" isLoading={saving}>
                  <PencilLine size={16} /> Save UPI ID
                </Button>
              </div>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
