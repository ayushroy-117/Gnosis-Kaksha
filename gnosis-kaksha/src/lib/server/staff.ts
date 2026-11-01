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

const text = (max: number) => z.string().trim().max(max).optional();
const date = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be a date`).optional().or(z.literal(''));
const tags = z.array(z.string().trim().min(1).max(60)).max(20).optional();

/**
 * Fields an admin can set when creating or editing a staff member: what is printed
 * on the ID card plus the employment terms. All optional so old accounts stay valid.
 */
export const staffDetailsSchema = z.object({
  department: text(60),
  phone: phone.optional().or(z.literal('')),
  fatherName: text(120),
  address: text(300),
  dateOfJoining: date('Date of joining'),
  employmentType: text(40),
  probation: text(40),
  workLocation: text(120),
  weeklyClasses: text(60),
  additionalDuties: text(200),
});
export type StaffDetailsInput = z.infer<typeof staffDetailsSchema>;

/** Fields the staff member edits on their own profile. */
export const selfProfileSchema = z.object({
  dob: date('Date of birth'),
  gender: text(20),
  bloodGroup: text(10),
  alternateEmail: z.string().trim().email('Enter a valid alternate email').max(200).optional().or(z.literal('')),
  emergencyContact: text(120),
  permanentAddress: text(300),
  nationality: text(40),
  maritalStatus: text(20),
  languages: text(120),
  hobbies: text(200),
  quote: text(200),
  qualification: text(200),
  experience: text(60),
  about: text(1500),
  teachingSkills: tags,
  technicalSkills: tags,
  certifications: z
    .array(z.object({ title: z.string().trim().min(2).max(120), issuer: z.string().trim().max(120).default(''), year: z.string().trim().max(20).default('') }))
    .max(20)
    .optional(),
});
export type SelfProfileInput = z.infer<typeof selfProfileSchema>;

/** Bank details: the staff member or the accountant. Monthly salary: accountant/admin only. */
export const bankSchema = z.object({
  bankHolder: text(120),
  bankName: text(120),
  bankAccount: z.string().trim().regex(/^\d{6,20}$/, 'Account number must be 6–20 digits').optional().or(z.literal('')),
  bankIfsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC (e.g. SBIN0001234)').optional().or(z.literal('')),
  bankAccountType: text(20),
});
export type BankInput = z.infer<typeof bankSchema>;

export interface Certification {
  title: string;
  issuer: string;
  year: string;
}

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
  // Profile tabs
  dob: string | null;
  gender: string | null;
  bloodGroup: string | null;
  alternateEmail: string | null;
  emergencyContact: string | null;
  permanentAddress: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  languages: string | null;
  hobbies: string | null;
  quote: string | null;
  qualification: string | null;
  experience: string | null;
  employmentType: string | null;
  probation: string | null;
  workLocation: string | null;
  about: string | null;
  teachingSkills: string[];
  technicalSkills: string[];
  weeklyClasses: string | null;
  additionalDuties: string | null;
  certifications: Certification[];
  monthlySalary: number | null;
  bankHolder: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  bankAccountType: string | null;
}

const ROLE_LABEL: Record<string, string> = { teacher: 'Faculty Member', accountant: 'Accountant', admin: 'Administrator' };

export function designationFor(role: string, department: string | null): string {
  return department ? `${department} Department` : ROLE_LABEL[role] ?? 'Staff';
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any> & {
  user_id: string;
  staff_code: string;
  employment_status: EmploymentStatus;
  profiles: { role: UserRole; full_name: string | null; email: string | null; branches?: { name: string } | null } | null;
};

/* eslint-enable @typescript-eslint/no-explicit-any */
const SELECT = '*, profiles(role, full_name, email, branches:branches(name))';

/** camelCase field -> staff_details column, for every editable field. */
const COLUMN: Record<string, string> = {
  department: 'department', phone: 'phone', fatherName: 'father_name', address: 'address', dateOfJoining: 'date_of_joining',
  employmentType: 'employment_type', probation: 'probation', workLocation: 'work_location', weeklyClasses: 'weekly_classes',
  additionalDuties: 'additional_duties', dob: 'dob', gender: 'gender', bloodGroup: 'blood_group', alternateEmail: 'alternate_email',
  emergencyContact: 'emergency_contact', permanentAddress: 'permanent_address', nationality: 'nationality',
  maritalStatus: 'marital_status', languages: 'languages', hobbies: 'hobbies', quote: 'quote', qualification: 'qualification',
  experience: 'experience', about: 'about', teachingSkills: 'teaching_skills', technicalSkills: 'technical_skills',
  certifications: 'certifications', bankHolder: 'bank_holder', bankName: 'bank_name', bankAccount: 'bank_account',
  bankIfsc: 'bank_ifsc', bankAccountType: 'bank_account_type', monthlySalary: 'monthly_salary',
};

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
    dob: r.dob ?? null,
    gender: r.gender ?? null,
    bloodGroup: r.blood_group ?? null,
    alternateEmail: r.alternate_email ?? null,
    emergencyContact: r.emergency_contact ?? null,
    permanentAddress: r.permanent_address ?? null,
    nationality: r.nationality ?? null,
    maritalStatus: r.marital_status ?? null,
    languages: r.languages ?? null,
    hobbies: r.hobbies ?? null,
    quote: r.quote ?? null,
    qualification: r.qualification ?? null,
    experience: r.experience ?? null,
    employmentType: r.employment_type ?? null,
    probation: r.probation ?? null,
    workLocation: r.work_location ?? null,
    about: r.about ?? null,
    teachingSkills: r.teaching_skills ?? [],
    technicalSkills: r.technical_skills ?? [],
    weeklyClasses: r.weekly_classes ?? null,
    additionalDuties: r.additional_duties ?? null,
    certifications: Array.isArray(r.certifications) ? r.certifications : [],
    monthlySalary: r.monthly_salary == null ? null : Number(r.monthly_salary),
    bankHolder: r.bank_holder ?? null,
    bankName: r.bank_name ?? null,
    bankAccount: r.bank_account ?? null,
    bankIfsc: r.bank_ifsc ?? null,
    bankAccountType: r.bank_account_type ?? null,
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

/** Save any subset of profile fields (callers validate with the schema matching who is editing). */
export async function saveStaffDetails(
  db: SupabaseClient,
  userId: string,
  role: UserRole,
  d: Partial<StaffDetailsInput & SelfProfileInput & BankInput & { monthlySalary: number | null }>
) {
  await ensureStaffDetails(db, userId, role);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(d)) {
    if (value === undefined || !COLUMN[key]) continue;
    patch[COLUMN[key]] = value === '' ? null : value;
  }
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
