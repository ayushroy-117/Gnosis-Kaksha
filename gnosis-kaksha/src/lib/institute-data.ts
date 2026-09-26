/**
 * Shared shapes for institute data, as returned by the /api/data/* endpoints,
 * plus small display helpers. Safe to import from client components — the
 * data itself is loaded from the server (see src/lib/server/institute.ts).
 */

export type EnrollmentStatus = 'active' | 'pending' | 'rejected';
export type StudentFeeState = 'paid' | 'due' | 'pending_verification';
export type TransactionStatus = 'verified' | 'pending' | 'rejected' | 'failed';
export type PaymentMethod = 'UPI' | 'Cash' | 'Card' | 'Bank Transfer';

export interface RosterStudent {
  id: string;
  registrationNumber: string;
  fullName: string;
  classNumber: number;
  stream: string | null;
  board: string;
  subjects: string[];
  parentName: string;
  mobile: string;
  email: string;
  previousPercentage: number;
  scholarshipPercent: number;
  monthlyTuition: number;
  tuitionAfterScholarship: number;
  mandatoryCharges: number;
  feeState: StudentFeeState;
  amountDue: number;
  admissionDate: string;
  status: EnrollmentStatus;
  tshirtSize?: string;
  address?: string;
  schoolName?: string;
  documentType?: string;
  hasAccount?: boolean;
}

/** What teachers get: no fees, scholarship or admission-payment details. */
export type TeacherRosterStudent = Pick<
  RosterStudent,
  'id' | 'registrationNumber' | 'fullName' | 'classNumber' | 'stream' | 'board' | 'subjects' | 'parentName' | 'mobile' | 'status' | 'admissionDate'
>;

export interface Transaction {
  id: string;
  /** Official receipt number once verified (RCPT-YYYY-NNNN); otherwise null. */
  receiptNumber: string | null;
  date: string;
  studentId: string;
  studentName: string;
  registrationNumber?: string;
  description: string;
  amount: number;
  method: PaymentMethod;
  purpose: 'admission' | 'tuition' | 'other';
  utr?: string;
  upiReference?: string;
  status: TransactionStatus;
  rejectedNote?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface InstituteNotice {
  id: string;
  title: string;
  content: string;
  date: string;
  audience: 'All' | 'Students' | 'Parents' | 'Staff';
  pinned: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: string | null;
}

export type AllocationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SubjectAllocationRequest {
  id: string;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  subject: string;
  classNumber: number;
  requestedBy: string;
  status: AllocationStatus;
  rejectionNote?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ClassDistribution {
  classNumber: number;
  count: number;
}

export interface AdminData {
  roster: RosterStudent[];
  pendingAdmissions: RosterStudent[];
  notices: InstituteNotice[];
  classDistribution: ClassDistribution[];
  pendingPaymentCount: number;
  accountCounts: Record<'admin' | 'accountant' | 'teacher' | 'student', number>;
  stats: {
    totalStudents: number;
    activeStudents: number;
    pendingAdmissions: number;
    classesOffered: number;
    monthlyTuitionBilled: number;
  };
  currentPeriod: string;
}

export interface AccountantData {
  roster: RosterStudent[];
  defaulters: RosterStudent[];
  transactions: Transaction[];
  pendingVerifications: Transaction[];
  stats: {
    collectedThisMonth: number;
    pendingDues: number;
    receiptsThisMonth: number;
    defaulterCount: number;
    pendingVerificationCount: number;
  };
  currentPeriod: string;
}

export interface TeacherData {
  roster: TeacherRosterStudent[];
  allocations: SubjectAllocationRequest[];
}

/** Label for the current billing month, e.g. "September 2026". */
export function currentPeriodLabel(date = new Date()): string {
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/** Receipt number if issued, else the internal transaction reference. */
export function receiptLabel(t: Pick<Transaction, 'id' | 'receiptNumber'>): string {
  return t.receiptNumber || t.id;
}

/** Human-readable class label, e.g. "Class 11 · Science" or "Class 7". */
export function classLabel(student: { classNumber: number; stream: string | null }): string {
  return student.stream ? `Class ${student.classNumber} · ${student.stream}` : `Class ${student.classNumber}`;
}

export { formatINR, formatDate } from '@/lib/format';
