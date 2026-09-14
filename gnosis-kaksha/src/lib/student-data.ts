import {
  calculateBill,
  calculateScholarship,
  SUBJECT_FEES,
  EXAM_FEE,
  TSHIRT_FEE,
} from '@/lib/fees';

export interface StudentProfile {
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
  admissionDate: string; // ISO
}

export interface EnrolledSubject {
  name: string;
  monthlyFee: number;
  teacher: string;
}

export interface FeePayment {
  id: string;
  date: string; // ISO
  description: string;
  amount: number;
  method: string;
  status: 'paid' | 'pending';
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
  nextDueDate: string; // ISO
  payments: FeePayment[];
}

export interface StudentNotice {
  id: string;
  title: string;
  content: string;
  date: string; // ISO
  pinned: boolean;
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
  Economics: 'Abu Sahid',
  'Political Science': 'Md. Ali Hasan',
};

function buildSampleData(): StudentData {
  // Illustrative Class 10 student.
  const classNumber = 10;
  const enrolledSubjectNames = ['Mathematics', 'Science', 'English', 'Bengali'];
  const previousPercentage = 84;

  const classFees = SUBJECT_FEES[classNumber] ?? {};
  const subjects: EnrolledSubject[] = enrolledSubjectNames.map((name) => ({
    name,
    monthlyFee: classFees[name] ?? 0,
    teacher: SUBJECT_TEACHERS[name] ?? 'To be assigned',
  }));

  const scholarshipPercent = calculateScholarship(previousPercentage);
  const bill = calculateBill(
    subjects.map((s) => ({ name: s.name, monthly_fee: s.monthlyFee })),
    scholarshipPercent
  );

  const feeStatus: FeeStatus = {
    monthlyTuition: bill.monthlyTuition,
    scholarshipPercent,
    scholarshipAmount: bill.scholarshipAmount,
    tuitionAfterScholarship: bill.tuitionAfterScholarship,
    examFee: EXAM_FEE,
    tshirtFee: TSHIRT_FEE,
    mandatoryCharges: bill.mandatoryCharges,
    finalPayable: bill.finalPayable,
    status: 'due',
    nextDueDate: '2026-09-10',
    payments: [
      {
        id: 'RCPT-2026-0812',
        date: '2026-08-05',
        description: 'August 2026 — Monthly tuition',
        amount: bill.tuitionAfterScholarship,
        method: 'UPI',
        status: 'paid',
      },
      {
        id: 'RCPT-2026-0731',
        date: '2026-07-04',
        description: 'July 2026 — Monthly tuition',
        amount: bill.tuitionAfterScholarship,
        method: 'Cash',
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
    ],
  };

  const profile: StudentProfile = {
    fullName: 'Ananya Das',
    registrationNumber: 'GK-2026-0142',
    classNumber,
    stream: null,
    board: 'SEBA',
    parentName: 'Rajib Das',
    mobile: '9876543210',
    guardianMobile: '9876500011',
    email: 'ananya.das@example.com',
    address: 'Block Road, Ramkrishna Nagar, Sribhumi, Assam',
    photoUrl: null,
    admissionDate: '2026-07-01',
  };

  const notices: StudentNotice[] = [
    {
      id: 'n1',
      title: 'Half-Yearly Examination Schedule',
      content:
        'Half-yearly exams for Classes VI–X begin on 22 September 2026. The detailed datesheet is available at the front desk and on the notice board.',
      date: '2026-08-28',
      pinned: true,
    },
    {
      id: 'n2',
      title: 'September Fee Reminder',
      content:
        'Monthly tuition for September 2026 is due by the 10th. Please clear dues to avoid a late fee.',
      date: '2026-08-25',
      pinned: true,
    },
    {
      id: 'n3',
      title: 'Independence Day Celebration',
      content:
        'All students are invited to the flag hoisting and cultural program on 15 August at 8:00 AM.',
      date: '2026-08-12',
      pinned: false,
    },
    {
      id: 'n4',
      title: 'New Study Material Uploaded',
      content:
        'Chapter-wise practice sheets for Mathematics and Science have been added to the materials library.',
      date: '2026-08-06',
      pinned: false,
    },
  ];

  return { profile, subjects, feeStatus, notices, isSample: true };
}

/**
 * Returns the current student's dashboard data.
 *
 * NOTE: This currently returns clearly-labeled sample data. To wire up live data,
 * replace the body with a Supabase query (fetch the `students` row for the
 * authenticated `auth.uid()`, join enrolled subjects / fee records / notices) and
 * set `isSample: false`. The return shape is intentionally stable so callers do
 * not need to change.
 */
export function getStudentData(): StudentData {
  return buildSampleData();
}

// Re-exported so existing `@/lib/student-data` imports keep working.
export { formatINR, formatDate } from '@/lib/format';
