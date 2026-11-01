import 'server-only';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionUser } from '@/lib/authz';

/**
 * Helpers shared by the staff/student portal modules: activity log,
 * notifications, file uploads stored as bytea, and "which student is this for".
 */

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Today's date in India (YYYY-MM-DD); all attendance and leave is in IST. */
export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/** Record what a staff member did. Never fails the request it's called from. */
export async function logActivity(db: SupabaseClient, user: SessionUser, action: string, detail?: string) {
  const { error } = await db.from('activity_log').insert({
    user_id: user.id,
    user_name: user.fullName,
    role: user.role,
    action,
    detail: detail?.slice(0, 500) ?? null,
  });
  if (error) console.error('[activity_log]', error);
}

/** Send an in-app notification to each user. Never fails the request it's called from. */
export async function notify(db: SupabaseClient, userIds: string[], n: { title: string; body?: string; link?: string }) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  const { error } = await db
    .from('notifications')
    .insert(ids.map((user_id) => ({ user_id, title: n.title.slice(0, 200), body: n.body?.slice(0, 500) ?? null, link: n.link ?? null })));
  if (error) console.error('[notifications]', error);
}

/** Account ids of the active students of a class at a branch. */
export async function studentAccountIds(db: SupabaseClient, branchId: string, classNumber: number): Promise<string[]> {
  const { data, error } = await db
    .from('profiles')
    .select('id, students!inner(branch_id, class_number, status)')
    .eq('students.branch_id', branchId)
    .eq('students.class_number', classNumber)
    .eq('students.status', 'active')
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []).map((r) => r.id as string);
}

/** Active teachers assigned to a subject for a class, at a branch. */
export async function teachersFor(db: SupabaseClient, branchId: string, classNumber: number, subject: string) {
  const { data, error } = await db
    .from('teacher_assignments')
    .select('teacher_id, profiles!inner(full_name, is_active, role, branch_id)')
    .eq('class_number', classNumber)
    .ilike('subject', subject)
    .eq('profiles.branch_id', branchId);
  if (error) throw error;
  return (data ?? [])
    .map((r) => ({ id: r.teacher_id as string, ...(r.profiles as unknown as { full_name: string | null; is_active: boolean; role: string }) }))
    .filter((t) => t.is_active && t.role === 'teacher')
    .map((t) => ({ id: t.id, name: t.full_name || 'Teacher' }));
}

/** The admin's account id (for notifications such as new leave requests). */
export async function adminIds(db: SupabaseClient): Promise<string[]> {
  const { data } = await db.from('profiles').select('id').eq('role', 'admin');
  return (data ?? []).map((r) => r.id as string);
}

/**
 * The student a student-portal request is about: the student's own record, or
 * for the admin, `?as=<studentId>` (same rule as /api/data/student).
 */
export function resolveStudentId(user: SessionUser, as: string | null): { studentId: string } | { response: NextResponse } {
  if (user.role === 'admin') {
    if (!as || !UUID.test(as)) {
      return { response: NextResponse.json({ error: 'Choose a student from Admin → Students to view their portal.' }, { status: 400 }) };
    }
    return { studentId: as };
  }
  if (!user.studentId) {
    return { response: NextResponse.json({ error: 'This account is not linked to a student record. Contact the institute office.' }, { status: 404 }) };
  }
  return { studentId: user.studentId };
}

// ---------------------------------------------------------------------------
// Files stored in the database
// ---------------------------------------------------------------------------

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type FileKind = 'image' | 'pdf' | 'video';
const KIND_MIMES: Record<FileKind, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  pdf: ['application/pdf'],
  video: ['video/mp4', 'video/webm'],
};

/** Identify a file from its first bytes (the browser's claimed type is not trusted). */
export function sniffMime(b: Buffer): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (b.length > 4 && b.subarray(0, 4).toString('ascii') === '%PDF') return 'application/pdf';
  if (b.length > 12 && b.subarray(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
  if (b.length > 4 && b.readUInt32BE(0) === 0x1a45dfa3) return 'video/webm';
  return null;
}

export function humanSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Read an uploaded file from a form, checking size and real type. */
export async function readUpload(
  value: FormDataEntryValue | null,
  kinds: FileKind[],
  maxBytes = MAX_UPLOAD_BYTES
): Promise<{ bytes: Buffer; mime: string; name: string; size: string } | { error: string } | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  if (value.size > maxBytes) return { error: `File is larger than ${maxBytes / 1024 / 1024} MB.` };
  const bytes = Buffer.from(await value.arrayBuffer());
  const mime = sniffMime(bytes);
  if (!mime || !kinds.some((k) => KIND_MIMES[k].includes(mime))) {
    const names = kinds.map((k) => ({ image: 'JPG/PNG image', pdf: 'PDF', video: 'MP4 video' })[k]).join(', ');
    return { error: `Only ${names} files can be uploaded.` };
  }
  return { bytes, mime, name: value.name.replace(/[\r\n"]/g, '').slice(0, 200) || 'file', size: humanSize(bytes.length) };
}

export const toBytea = (b: Buffer) => `\\x${b.toString('hex')}`;

/** Serve a bytea column as a file download / inline view. */
export function fileResponse(hex: unknown, mime: string, name: string, inline = true) {
  const s = String(hex);
  const bytes = Buffer.from(s.startsWith('\\x') ? s.slice(2) : s, 'hex');
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(bytes.length),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      // A strict CSP would stop the browser's PDF viewer, so only images get one.
      ...(mime.startsWith('image/') ? { 'Content-Security-Policy': "default-src 'none'" } : {}),
    },
  });
}
