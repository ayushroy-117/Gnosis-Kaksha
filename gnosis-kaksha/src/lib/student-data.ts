import {
  calculateBill,
  calculateScholarship,
  SUBJECT_FEES,
  EXAM_FEE,
  TSHIRT_FEE,
} from '@/lib/fees';
import {
  getStudentById,
  getStudentByRegNo,
  getStudentByEmail,
  getAllStudents,
  getAllTransactions,
  getAllNotices,
} from '@/lib/institute-store';

export interface StudentProfile {
  id?: string;
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
}

export interface EnrolledSubject {
  name: string;
  monthlyFee: number;
  teacher: string;
}

export interface FeePayment {
  id: string;
  date: string;
  description: string;
  amount: number;
  method: string;
  status: 'paid' | 'pending';
  utr?: string;
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
  status: 'paid' | 'due' | 'partial';
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
  isSample: boolean;
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
  Chemistry: 'Suman Roy',
  Economics: 'Abu Sahid',
  'Political Science': 'Md. Ali Hasan',
  'Social Science': 'Riya Nath',
};

export function getStudentData(userIdentifier?: string): StudentData {
  let student = null;

  if (userIdentifier) {
    const clean = userIdentifier.trim();
    student =
      getStudentByRegNo(clean) ||
      getStudentByEmail(clean) ||
      getStudentById(clean);
  }

  // If not found by identifier, default to first student in store (Ananya Das, stu-0142)
  if (!student) {
    const all = getAllStudents();
    student = all.find((s) => s.id === 'stu-0142') || all[0];
  }

  const classNumber = student?.classNumber || 10;
  const enrolledSubjectNames = student?.subjects?.length
    ? student.subjects
    : ['Mathematics', 'Science', 'English', 'Bengali'];

  const classFees = SUBJECT_FEES[classNumber] ?? {};
  const subjects: EnrolledSubject[] = enrolledSubjectNames.map((name) => ({
    name,
    monthlyFee: classFees[name] ?? 500,
    teacher: SUBJECT_TEACHERS[name] ?? 'To be assigned',
  }));

  const scholarshipPercent = student?.scholarshipPercent ?? calculateScholarship(student?.previousPercentage || 80);
  const bill = calculateBill(
    subjects.map((s) => ({ name: s.name, monthly_fee: s.monthlyFee })),
    scholarshipPercent
  );

  // Fetch real payments for this student
  const studentTxns = getAllTransactions().filter((t) => t.studentId === student?.id);

  const payments: FeePayment[] = studentTxns.length
    ? studentTxns.map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        method: t.method,
        status: t.status === 'pending' ? 'pending' : 'paid',
        utr: t.utr,
      }))
    : [
        {
          id: 'RCPT-2026-0812',
          date: '2026-08-05',
          description: 'August 2026 — Monthly tuition',
          amount: bill.tuitionAfterScholarship,
          method: 'UPI',
          status: 'paid',
        },
        {
          id: 'RCPT-2026-0701',
          date: '2026-07-01',
          description: 'Admission — Exam & T-shirt charges',
          amount: bill.mandatoryCharges,
          method: 'UPI',
          status: 'paid',
        },
      ];

  const isPaid = student?.feeState === 'paid';

  const feeStatus: FeeStatus = {
    monthlyTuition: student?.monthlyTuition || bill.monthlyTuition,
    scholarshipPercent,
    scholarshipAmount: bill.scholarshipAmount,
    tuitionAfterScholarship: student?.tuitionAfterScholarship || bill.tuitionAfterScholarship,
    examFee: EXAM_FEE,
    tshirtFee: TSHIRT_FEE,
    mandatoryCharges: bill.mandatoryCharges,
    finalPayable: isPaid ? 0 : (student?.amountDue ?? bill.tuitionAfterScholarship),
    status: isPaid ? 'paid' : 'due',
    nextDueDate: '2026-09-10',
    payments,
  };

  const profile: StudentProfile = {
    id: student?.id,
    fullName: student?.fullName || 'Ananya Das',
    registrationNumber: student?.registrationNumber || 'GK-2026-0142',
    classNumber,
    stream: student?.stream || null,
    board: student?.board || 'SEBA',
    parentName: student?.parentName || 'Guardian',
    mobile: student?.mobile || '9876543210',
    guardianMobile: student?.mobile || '9876543210',
    email: student?.email || 'ananya.das@example.com',
    address: student?.address || 'Block Road, Ramkrishna Nagar, Sribhumi, Assam',
    photoUrl: null,
    admissionDate: student?.admissionDate || '2026-07-01',
  };

  const notices: StudentNotice[] = getAllNotices().map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    date: n.date,
    pinned: n.pinned,
    attachmentUrl: n.attachmentUrl ?? null,
    attachmentName: n.attachmentName ?? null,
    attachmentSize: n.attachmentSize ?? null,
  }));

  return { profile, subjects, feeStatus, notices, isSample: false };
}

// Re-exported so existing `@/lib/student-data` imports keep working.
export { formatINR, formatDate } from '@/lib/format';
