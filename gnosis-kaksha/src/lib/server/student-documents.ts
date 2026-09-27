import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export type DocumentKind = 'photo' | 'signature';
export const DOCUMENT_KINDS: DocumentKind[] = ['photo', 'signature'];

const MAX_BYTES: Record<DocumentKind, number> = { photo: 2 * 1024 * 1024, signature: 1024 * 1024 };

/** Identify the image type from its first bytes (never trust the claimed type). */
function sniff(bytes: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length > 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

const LABEL: Record<DocumentKind, string> = { photo: 'Photo', signature: 'Signature' };

/** Parse a data: URL from the browser into a validated image, or an error message. */
export function parseImageDataUrl(kind: DocumentKind, dataUrl: unknown): { bytes: Buffer; mime: string } | { error: string } {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return { error: `${LABEL[kind]} is required — upload a JPG or PNG image.` };
  }
  const comma = dataUrl.indexOf(',');
  if (comma < 0 || !dataUrl.slice(0, comma).includes(';base64')) return { error: `${LABEL[kind]} could not be read.` };
  const bytes = Buffer.from(dataUrl.slice(comma + 1), 'base64');
  if (bytes.length === 0) return { error: `${LABEL[kind]} is empty.` };
  if (bytes.length > MAX_BYTES[kind]) {
    return { error: `${LABEL[kind]} is too large (max ${MAX_BYTES[kind] / 1024 / 1024} MB).` };
  }
  const mime = sniff(bytes);
  if (!mime) return { error: `${LABEL[kind]} must be a JPG, PNG or WebP image.` };
  return { bytes, mime };
}

export async function saveStudentDocument(
  db: SupabaseClient,
  studentId: string,
  kind: DocumentKind,
  image: { bytes: Buffer; mime: string },
  updatedBy: string
) {
  const { error } = await db.from('student_documents').upsert({
    student_id: studentId,
    kind,
    mime_type: image.mime,
    data: `\\x${image.bytes.toString('hex')}`,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  });
  if (error) throw error;
}

/** studentId -> { photo?: url, signature?: url } with a version for cache-busting. */
export async function documentUrls(db: SupabaseClient, studentIds?: string[]) {
  let q = db.from('student_documents').select('student_id, kind, updated_at');
  if (studentIds) q = q.in('student_id', studentIds);
  const { data, error } = await q;
  if (error) throw error;
  const map = new Map<string, Partial<Record<DocumentKind, string>>>();
  for (const r of data ?? []) {
    const entry = map.get(r.student_id) ?? {};
    entry[r.kind as DocumentKind] = `/api/students/${r.student_id}/documents/${r.kind}?v=${Date.parse(r.updated_at)}`;
    map.set(r.student_id, entry);
  }
  return map;
}
