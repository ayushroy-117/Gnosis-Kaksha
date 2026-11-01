import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { UserRole } from '@/lib/permissions';

export type EmploymentStatus = 'active' | 'resigned' | 'terminated';

/** The code printed on the card / QR: GK-FAC-1A2B3C (teachers), GK-ACC-…, GK-ADM-…. */
export function staffCodeFor(role: UserRole, userId: string): string {
  const prefix = role === 'teacher' ? 'FAC' : role.slice(0, 3).toUpperCase();
  return `GK-${prefix}-${userId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

const phone = z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');

/** Fields an admin can set when creating or editing a staff member. All optional so old accounts stay valid. */
export const staffDetailsSchema = z.object({
  department: z.string().trim().max(60).optional(),
  phone: phone.optional().or(z.literal('')),
  fatherName: z.string().trim().max(120).optional(),
  address: z.string().trim().max(300).optional(),
  dateOfJoining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of joining must be a date').optional().or(z.literal('')),
});
export type StaffDetailsInput = z.infer<typeof staffDetailsSchema>;

export interface StaffProfile {
  userId: string;
  staffCode: string;
  fullName: string;
  email: string | null;
  role: UserRole;
  department: string | null;
  /** "English Department", or the role label when no department is set. */
  designation: string;
  phone: string | null;
  fatherName: string | null;
  address: string | null;
  dateOfJoining: string | null;
  employmentStatus: EmploymentStatus;
  statusChangedOn: string | null;
  branchName: string | null;
  photoUrl: string | null;
}

const ROLE_LABEL: Record<string, string> = { teacher: 'Faculty Member', accountant: 'Accountant', admin: 'Administrator' };

export function designationFor(role: string, department: string | null): string {
  return department ? `${department} Department` : ROLE_LABEL[role] ?? 'Staff';
}

type Row = {
  user_id: string;
  staff_code: string;
  department: string | null;
  phone: string | null;
  father_name: string | null;
  address: string | null;
  date_of_joining: string | null;
  employment_status: EmploymentStatus;
  status_changed_on: string | null;
  profiles: { role: UserRole; full_name: string | null; email: string | null; branches?: { name: string } | null } | null;
};

const SELECT =
  'user_id, staff_code, department, phone, father_name, address, date_of_joining, employment_status, status_changed_on, profiles(role, full_name, email, branches:branches(name))';

async function photoUrls(db: SupabaseClient, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data, error } = await db.from('staff_photos').select('user_id, updated_at').in('user_id', ids);
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.user_id as string, `/api/staff/${r.user_id}/photo?v=${Date.parse(r.updated_at)}`]));
}

function toProfile(r: Row, photo: string | null): StaffProfile {
  const role = (r.profiles?.role ?? 'teacher') as UserRole;
  return {
    userId: r.user_id,
    staffCode: r.staff_code,
    fullName: r.profiles?.full_name || r.profiles?.email || 'Staff',
    email: r.profiles?.email ?? null,
    role,
    department: r.department,
    designation: designationFor(role, r.department),
    phone: r.phone,
    fatherName: r.father_name,
    address: r.address,
    dateOfJoining: r.date_of_joining,
    employmentStatus: r.employment_status,
    statusChangedOn: r.status_changed_on,
    branchName: r.profiles?.branches?.name ?? null,
    photoUrl: photo,
  };
}

/** Make sure a staff row exists (accounts created before this feature have none). */
export async function ensureStaffDetails(db: SupabaseClient, userId: string, role: UserRole) {
  const { error } = await db
    .from('staff_details')
    .upsert({ user_id: userId, staff_code: staffCodeFor(role, userId) }, { onConflict: 'user_id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function loadStaffProfile(db: SupabaseClient, userId: string): Promise<StaffProfile | null> {
  const { data, error } = await db.from('staff_details').select(SELECT).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const photos = await photoUrls(db, [userId]);
  return toProfile(data as unknown as Row, photos.get(userId) ?? null);
}

export async function loadStaffByCode(db: SupabaseClient, code: string): Promise<StaffProfile | null> {
  const { data, error } = await db.from('staff_details').select(SELECT).eq('staff_code', code.toUpperCase()).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Row;
  const photos = await photoUrls(db, [row.user_id]);
  return toProfile(row, photos.get(row.user_id) ?? null);
}

export async function loadAllStaff(db: SupabaseClient): Promise<Map<string, StaffProfile>> {
  const { data, error } = await db.from('staff_details').select(SELECT);
  if (error) throw error;
  const rows = (data ?? []) as unknown as Row[];
  const photos = await photoUrls(db, rows.map((r) => r.user_id));
  return new Map(rows.map((r) => [r.user_id, toProfile(r, photos.get(r.user_id) ?? null)]));
}

export async function saveStaffDetails(db: SupabaseClient, userId: string, role: UserRole, d: StaffDetailsInput) {
  await ensureStaffDetails(db, userId, role);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (d.department !== undefined) patch.department = d.department || null;
  if (d.phone !== undefined) patch.phone = d.phone || null;
  if (d.fatherName !== undefined) patch.father_name = d.fatherName || null;
  if (d.address !== undefined) patch.address = d.address || null;
  if (d.dateOfJoining !== undefined) patch.date_of_joining = d.dateOfJoining || null;
  const { error } = await db.from('staff_details').update(patch).eq('user_id', userId);
  if (error) throw error;
}

export async function saveStaffPhoto(db: SupabaseClient, userId: string, image: { bytes: Buffer; mime: string }) {
  const { error } = await db.from('staff_photos').upsert({
    user_id: userId,
    mime_type: image.mime,
    data: `\\x${image.bytes.toString('hex')}`,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function setEmploymentStatus(db: SupabaseClient, userId: string, role: UserRole, status: EmploymentStatus) {
  await ensureStaffDetails(db, userId, role);
  const { error } = await db
    .from('staff_details')
    .update({
      employment_status: status,
      status_changed_on: status === 'active' ? null : new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}
