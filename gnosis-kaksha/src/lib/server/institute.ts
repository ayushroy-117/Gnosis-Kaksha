import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateBill, EXAM_FEE, SUBJECT_FEES, TSHIRT_FEE } from '@/lib/fees';
import {
  currentPeriodLabel,
  type AccountantData,
  type AdminData,
  type InstituteNotice,
  type RosterStudent,
  type SubjectAllocationRequest,
  type TeacherData,
  type TeacherRosterStudent,
  type Transaction,
} from '@/lib/institute-data';
import type { FeePayment, StudentData, StudentNotice } from '@/lib/student-data';

// ---------------------------------------------------------------------------
// Row mappers (DB snake_case -> app camelCase)
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapStudent(r: any): RosterStudent {
  return {
    id: r.id,
    registrationNumber: r.registration_number,
    fullName: r.full_name,
    classNumber: r.class_number,
    stream: r.stream ?? null,
    board: r.board ?? 'SEBA',
    subjects: r.subjects ?? [],
    parentName: r.parent_name ?? '',
    mobile: r.mobile ?? '',
    email: r.email ?? '',
    previousPercentage: Number(r.previous_percentage ?? 0),
    scholarshipPercent: Number(r.scholarship_percent ?? 0),
    monthlyTuition: Number(r.monthly_tuition ?? 0),
    tuitionAfterScholarship: Number(r.tuition_after_scholarship ?? 0),
    mandatoryCharges: Number(r.mandatory_charges ?? 0),
    feeState: r.fee_state,
    amountDue: Number(r.amount_due ?? 0),
    admissionDate: r.admission_date,
    status: r.status,
    tshirtSize: r.tshirt_size ?? undefined,
    address: r.address ?? undefined,
    schoolName: r.school_name ?? undefined,
    documentType: r.document_type ?? undefined,
  };
}

export function mapTransaction(r: any): Transaction {
  return {
    id: r.id,
    receiptNumber: r.receipt_number ?? null,
    date: r.date,
    studentId: r.student_id,
    studentName: r.student_name,
    registrationNumber: r.students?.registration_number ?? undefined,
    description: r.description,
    amount: Number(r.amount),
    method: r.method,
    purpose: r.purpose ?? 'tuition',
    utr: r.utr ?? undefined,
    upiReference: r.upi_reference ?? undefined,
    status: r.status,
    rejectedNote: r.rejected_note ?? undefined,
    verifiedBy: r.verified_by ?? undefined,
    verifiedAt: r.verified_at ?? undefined,
  };
}

export function mapNotice(r: any): InstituteNotice {
  const url: string | null = r.external_url ?? null;
  return {
    id: r.id,
    title: r.title,
    content: r.content ?? '',
    date: (r.published_at ?? r.created_at ?? new Date().toISOString()).slice(0, 10),
    audience: r.audience ?? 'All',
    pinned: Boolean(r.is_pinned),
    attachmentUrl: url,
    attachmentName: r.attachment_name ?? (url && !url.startsWith('data:') ? 'Open link' : url ? 'Attachment' : null),
    attachmentSize: r.attachment_size ?? null,
  };
}

export function mapAllocation(r: any): SubjectAllocationRequest {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    registrationNumber: r.registration_number,
    subject: r.subject,
    classNumber: r.class_number,
    requestedBy: r.requested_by,
    status: r.status,
    rejectionNote: r.rejection_note ?? undefined,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at ?? undefined,
    resolvedBy: r.resolved_by ?? undefined,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function toTeacherView(s: RosterStudent): TeacherRosterStudent {
  const { id, registrationNumber, fullName, classNumber, stream, board, subjects, parentName, mobile, status, admissionDate } = s;
  return { id, registrationNumber, fullName, classNumber, stream, board, subjects, parentName, mobile, status, admissionDate };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function must<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return (data ?? []) as T;
}

export async function getRoster(db: SupabaseClient): Promise<RosterStudent[]> {
  const rows = await must(db.from('students').select('*').order('created_at', { ascending: false }));
  return (rows as unknown[]).map(mapStudent);
}

export async function getTransactions(db: SupabaseClient, studentId?: string): Promise<Transaction[]> {
  let q = db
    .from('transactions')
    .select('*, students(registration_number)')
    .order('created_at', { ascending: false });
  if (studentId) q = q.eq('student_id', studentId);
  const rows = await must(q);
  return (rows as unknown[]).map(mapTransaction);
}

/** Audiences a viewer may see. Staff notices never reach students/public. */
export function noticeAudiencesFor(viewer: 'public' | 'student' | 'staff'): InstituteNotice['audience'][] {
  if (viewer === 'staff') return ['All', 'Students', 'Parents', 'Staff'];
  if (viewer === 'student') return ['All', 'Students', 'Parents'];
  return ['All', 'Students', 'Parents'];
}

export async function getNotices(db: SupabaseClient, audiences: InstituteNotice['audience'][]): Promise<InstituteNotice[]> {
  const rows = await must(
    db
      .from('notices')
      .select('*')
      .eq('is_active', true)
      .in('audience', audiences)
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false })
  );
  return (rows as unknown[]).map(mapNotice);
}

export async function getAllocations(db: SupabaseClient): Promise<SubjectAllocationRequest[]> {
  const rows = await must(db.from('allocation_requests').select('*').order('created_at', { ascending: false }));
  return (rows as unknown[]).map(mapAllocation);
}

function monthKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(date);
}

// ---------------------------------------------------------------------------
// Per-role payloads
// ---------------------------------------------------------------------------

export async function buildAdminData(db: SupabaseClient): Promise<AdminData> {
  const [roster, notices, pending, profiles] = await Promise.all([
    getRoster(db),
    getNotices(db, noticeAudiencesFor('staff')),
    db.from('transactions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    must(db.from('profiles').select('role')),
  ]);

  const active = roster.filter((s) => s.status === 'active');
  const pendingAdmissions = roster.filter((s) => s.status === 'pending');
  const distribution = new Map<number, number>();
  for (const s of roster) distribution.set(s.classNumber, (distribution.get(s.classNumber) ?? 0) + 1);

  const accountCounts = { admin: 0, accountant: 0, teacher: 0, student: 0 };
  for (const p of profiles as Array<{ role: keyof typeof accountCounts }>) accountCounts[p.role] += 1;

  return {
    roster,
    pendingAdmissions,
    notices,
    classDistribution: [...distribution.entries()]
      .map(([classNumber, count]) => ({ classNumber, count }))
      .sort((a, b) => a.classNumber - b.classNumber),
    pendingPaymentCount: pending.count ?? 0,
    accountCounts,
    stats: {
      totalStudents: roster.length,
      activeStudents: active.length,
      pendingAdmissions: pendingAdmissions.length,
      classesOffered: distribution.size,
      monthlyTuitionBilled: active.reduce((sum, s) => sum + s.tuitionAfterScholarship, 0),
    },
    currentPeriod: currentPeriodLabel(),
  };
}

export async function buildAccountantData(db: SupabaseClient): Promise<AccountantData> {
  const [roster, transactions] = await Promise.all([getRoster(db), getTransactions(db)]);
  const month = monthKey();
  const verifiedThisMonth = transactions.filter(
    (t) => t.status === 'verified' && (t.verifiedAt ?? t.date).startsWith(month)
  );
  const defaulters = roster.filter((s) => s.status === 'active' && s.feeState === 'due' && s.amountDue > 0);
  // Oldest first: the queue is worked in submission order.
  const pendingVerifications = transactions.filter((t) => t.status === 'pending').reverse();

  return {
    roster,
    defaulters,
    transactions,
    pendingVerifications,
    stats: {
      collectedThisMonth: verifiedThisMonth.reduce((sum, t) => sum + t.amount, 0),
      pendingDues: defaulters.reduce((sum, s) => sum + s.amountDue, 0),
      receiptsThisMonth: verifiedThisMonth.length,
      defaulterCount: defaulters.length,
      pendingVerificationCount: pendingVerifications.length,
    },
    currentPeriod: currentPeriodLabel(),
  };
}

export async function buildTeacherData(db: SupabaseClient): Promise<TeacherData> {
  const [roster, allocations] = await Promise.all([getRoster(db), getAllocations(db)]);
  return {
    roster: roster.filter((s) => s.status === 'active').map(toTeacherView),
    allocations,
  };
}

// Teachers assigned per subject (from the institute's teacher roster).
const SUBJECT_TEACHERS: Record<string, string> = {
  Mathematics: 'Joydeep Dey',
  Science: 'Ankur Kumar Nath',
  English: 'Anal Choudhary',
  Bengali: 'Susmita Nath',
  History: 'Riya Nath',
  Physics: 'Ankur Kumar Nath',
  Biology: 'Barnali Paul',
  Chemistry: 'To be assigned',
  Economics: 'Abu Sahid',
  'Political Science': 'Md. Ali Hasan',
  'Social Science': 'Riya Nath',
};

/**
 * What the student owes right now. Until the admission is completed the
 * admission payment (first month + exam + T-shirt) is due; afterwards the
 * running tuition balance.
 */
export function outstandingFor(s: RosterStudent): { amount: number; purpose: 'admission' | 'tuition' } {
  if (s.status === 'pending') {
    return { amount: s.tuitionAfterScholarship + s.mandatoryCharges, purpose: 'admission' };
  }
  return { amount: s.feeState === 'paid' ? 0 : s.amountDue, purpose: 'tuition' };
}

/** 10th of this month, or of next month once this month is paid. */
function nextDueDate(paid: boolean): string {
  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth() + (paid || now.getDate() > 10 ? 1 : 0), 10);
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-10`;
}

export async function buildStudentData(db: SupabaseClient, studentId: string): Promise<StudentData | null> {
  const { data: row, error } = await db.from('students').select('*').eq('id', studentId).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const student = mapStudent(row);

  const [transactions, noticeList] = await Promise.all([
    getTransactions(db, student.id),
    getNotices(db, noticeAudiencesFor('student')),
  ]);

  const classFees = SUBJECT_FEES[student.classNumber] ?? {};
  const subjects = student.subjects.map((name) => ({
    name,
    monthlyFee: classFees[name] ?? 0,
    teacher: SUBJECT_TEACHERS[name] ?? 'To be assigned',
  }));
  const bill = calculateBill(
    subjects.map((s) => ({ name: s.name, monthly_fee: s.monthlyFee })),
    student.scholarshipPercent
  );

  const payments: FeePayment[] = transactions.map((t) => ({
    id: t.id,
    receiptNumber: t.receiptNumber,
    date: t.date,
    description: t.description,
    amount: t.amount,
    method: t.method,
    status: t.status === 'verified' ? 'paid' : t.status === 'pending' ? 'pending' : 'rejected',
    utr: t.utr,
    rejectedNote: t.rejectedNote,
  }));

  const hasPending = transactions.some((t) => t.status === 'pending');
  const status: StudentData['feeStatus']['status'] = hasPending
    ? 'pending_verification'
    : student.feeState === 'paid' || student.amountDue <= 0
      ? 'paid'
      : 'due';

  const notices: StudentNotice[] = noticeList.map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    date: n.date,
    pinned: n.pinned,
    attachmentUrl: n.attachmentUrl,
    attachmentName: n.attachmentName,
    attachmentSize: n.attachmentSize,
  }));

  return {
    profile: {
      id: student.id,
      fullName: student.fullName,
      registrationNumber: student.registrationNumber,
      classNumber: student.classNumber,
      stream: student.stream,
      board: student.board,
      parentName: student.parentName,
      mobile: student.mobile,
      guardianMobile: (row.parent_phone as string | null) || student.mobile,
      email: student.email,
      address: student.address ?? '',
      photoUrl: (row.profile_photo_url as string | null) ?? null,
      admissionDate: student.admissionDate,
      enrollmentStatus: student.status,
    },
    subjects,
    feeStatus: {
      monthlyTuition: student.monthlyTuition || bill.monthlyTuition,
      scholarshipPercent: student.scholarshipPercent,
      scholarshipAmount: bill.scholarshipAmount,
      tuitionAfterScholarship: student.tuitionAfterScholarship || bill.tuitionAfterScholarship,
      examFee: EXAM_FEE,
      tshirtFee: TSHIRT_FEE,
      mandatoryCharges: student.mandatoryCharges || bill.mandatoryCharges,
      finalPayable: status === 'paid' ? 0 : outstandingFor(student).amount,
      status,
      nextDueDate: nextDueDate(status === 'paid'),
      payments,
    },
    notices,
  };
}
