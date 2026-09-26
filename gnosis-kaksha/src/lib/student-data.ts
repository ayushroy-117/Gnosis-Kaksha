/**
 * Shapes for the student portal, as returned by GET /api/data/student.
 * Safe for client components.
 */
import type { EnrollmentStatus } from '@/lib/institute-data';

export interface StudentProfile {
  id: string;
  fullName: string;
  registrationNumber: string;
  classNumber: number;
  stream: string | null;
  board: string;
  parentName: string;
  mobile: string;
  guardianMobile: string;
  email: string;
  address: string;
  photoUrl: string | null;
  admissionDate: string;
  enrollmentStatus: EnrollmentStatus;
}

export interface EnrolledSubject {
  name: string;
  monthlyFee: number;
  teacher: string;
}

export interface FeePayment {
  id: string;
  receiptNumber: string | null;
  date: string;
  description: string;
  amount: number;
  method: string;
  status: 'paid' | 'pending' | 'rejected';
  utr?: string;
  rejectedNote?: string;
}

export interface FeeStatus {
  monthlyTuition: number;
  scholarshipPercent: number;
  scholarshipAmount: number;
  tuitionAfterScholarship: number;
  examFee: number;
  tshirtFee: number;
  mandatoryCharges: number;
  finalPayable: number;
  status: 'paid' | 'due' | 'pending_verification';
  nextDueDate: string;
  payments: FeePayment[];
}

export interface StudentNotice {
  id: string;
  title: string;
  content: string;
  date: string;
  pinned: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSize?: string | null;
}

export interface StudentData {
  profile: StudentProfile;
  subjects: EnrolledSubject[];
  feeStatus: FeeStatus;
  notices: StudentNotice[];
}

export { formatINR, formatDate } from '@/lib/format';
