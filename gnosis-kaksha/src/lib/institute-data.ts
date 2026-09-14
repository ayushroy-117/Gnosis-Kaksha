import {
  calculateBill,
  calculateScholarship,
  SUBJECT_FEES,
} from '@/lib/fees';

/**
 * Institute-wide sample data shared by the Admin and Accountant portals.
 *
 * A single roster of students is the source of truth; the admin and accountant
 * views are *derived* from it so the two portals always agree on counts, dues
 * and collections. Fee figures are computed with the same `lib/fees.ts` engine
 * the public admission form uses, so nothing drifts.
 *
 * NOTE: This is clearly-labeled sample data. To wire up live data, replace the
 * body of `buildRoster()` with a Supabase query over the `students` table (join
 * subjects + fee records) and keep the derivations below unchanged.
 */

export type EnrollmentStatus = 'active' | 'pending';
export type StudentFeeState = 'paid' | 'due';

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
  /** Sum of subject monthly fees, before scholarship. */
  monthlyTuition: number;
  /** Recurring monthly tuition after the scholarship discount. */
  tuitionAfterScholarship: number;
  /** One-time exam + t-shirt charges taken at admission. */
  mandatoryCharges: number;
  /** Whether this month's tuition has been cleared. */
  feeState: StudentFeeState;
  /** Outstanding amount for the current cycle (0 when paid). */
  amountDue: number;
  admissionDate: string; // ISO
  status: EnrollmentStatus;
}

export interface Transaction {
  id: string; // receipt number
  date: string; // ISO
  studentId: string;
  studentName: string;
  description: string;
  amount: number;
  method: 'UPI' | 'Cash' | 'Card' | 'Bank Transfer';
}

export interface InstituteNotice {
  id: string;
  title: string;
  content: string;
  date: string; // ISO
  audience: 'All' | 'Students' | 'Parents' | 'Staff';
  pinned: boolean;
}

// The month the sample data is framed around (matches the seeded receipts).
const CURRENT_PERIOD = 'September 2026';

interface RosterSeed {
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
  admissionDate: string;
  status: EnrollmentStatus;
  paidThisMonth: boolean;
}

const ROSTER_SEED: RosterSeed[] = [
  {
    id: 'stu-0142',
    registrationNumber: 'GK-2026-0142',
    fullName: 'Ananya Das',
    classNumber: 10,
    stream: null,
    board: 'SEBA',
    subjects: ['Mathematics', 'Science', 'English', 'Bengali'],
    parentName: 'Rajib Das',
    mobile: '9876543210',
    email: 'ananya.das@example.com',
    previousPercentage: 84,
    admissionDate: '2026-07-01',
    status: 'active',
    paidThisMonth: false,
  },
  {
    id: 'stu-0138',
    registrationNumber: 'GK-2026-0138',
    fullName: 'Rohan Deb',
    classNumber: 12,
    stream: 'Science',
    board: 'CBSE',
    subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'],
    parentName: 'Sanjib Deb',
    mobile: '9954012233',
    email: 'rohan.deb@example.com',
    previousPercentage: 91,
    admissionDate: '2026-06-18',
    status: 'active',
    paidThisMonth: true,
  },
  {
    id: 'stu-0151',
    registrationNumber: 'GK-2026-0151',
    fullName: 'Priya Nath',
    classNumber: 9,
    stream: null,
    board: 'SEBA',
    subjects: ['Mathematics', 'Science', 'English', 'History'],
    parentName: 'Dipankar Nath',
    mobile: '8811223344',
    email: 'priya.nath@example.com',
    previousPercentage: 78,
    admissionDate: '2026-07-05',
    status: 'active',
    paidThisMonth: true,
  },
  {
    id: 'stu-0129',
    registrationNumber: 'GK-2026-0129',
    fullName: 'Imran Hussain',
    classNumber: 11,
    stream: 'Science',
    board: 'CBSE',
    subjects: ['Physics', 'Chemistry', 'Mathematics', 'English'],
    parentName: 'Anwar Hussain',
    mobile: '9706551020',
    email: 'imran.hussain@example.com',
    previousPercentage: 88,
    admissionDate: '2026-06-22',
    status: 'active',
    paidThisMonth: false,
  },
  {
    id: 'stu-0160',
    registrationNumber: 'GK-2026-0160',
    fullName: 'Sneha Roy',
    classNumber: 7,
    stream: null,
    board: 'SEBA',
    subjects: ['Mathematics', 'Science', 'English'],
    parentName: 'Bikash Roy',
    mobile: '9435667788',
    email: 'sneha.roy@example.com',
    previousPercentage: 72,
    admissionDate: '2026-07-10',
    status: 'active',
    paidThisMonth: true,
  },
  {
    id: 'stu-0122',
    registrationNumber: 'GK-2026-0122',
    fullName: 'Arjun Sinha',
    classNumber: 12,
    stream: 'Arts',
    board: 'SEBA',
    subjects: ['History', 'Political Science', 'Economics', 'Bengali'],
    parentName: 'Prakash Sinha',
    mobile: '9101223344',
    email: 'arjun.sinha@example.com',
    previousPercentage: 65,
    admissionDate: '2026-06-15',
    status: 'active',
    paidThisMonth: false,
  },
  {
    id: 'stu-0175',
    registrationNumber: 'GK-2026-0175',
    fullName: 'Kabir Ahmed',
    classNumber: 5,
    stream: null,
    board: 'SEBA',
    subjects: ['Mathematics', 'Science', 'English', 'Bengali', 'Social Science'],
    parentName: 'Sahil Ahmed',
    mobile: '9864551122',
    email: 'kabir.ahmed@example.com',
    previousPercentage: 95,
    admissionDate: '2026-08-29',
    status: 'pending',
    paidThisMonth: false,
  },
  {
    id: 'stu-0176',
    registrationNumber: 'GK-2026-0176',
    fullName: 'Meghna Choudhury',
    classNumber: 8,
    stream: null,
    board: 'CBSE',
    subjects: ['Mathematics', 'Science', 'English'],
    parentName: 'Nabin Choudhury',
    mobile: '9577001234',
    email: 'meghna.choudhury@example.com',
    previousPercentage: 81,
    admissionDate: '2026-08-31',
    status: 'pending',
    paidThisMonth: false,
  },
  {
    id: 'stu-0148',
    registrationNumber: 'GK-2026-0148',
    fullName: 'Farhan Ali',
    classNumber: 10,
    stream: null,
    board: 'SEBA',
    subjects: ['Mathematics', 'Science', 'English'],
    parentName: 'Kamal Ali',
    mobile: '9127884455',
    email: 'farhan.ali@example.com',
    previousPercentage: 69,
    admissionDate: '2026-07-02',
    status: 'active',
    paidThisMonth: true,
  },
  {
    id: 'stu-0163',
    registrationNumber: 'GK-2026-0163',
    fullName: 'Diya Sarma',
    classNumber: 6,
    stream: null,
    board: 'SEBA',
    subjects: ['Mathematics', 'Science', 'English', 'Bengali'],
    parentName: 'Hiren Sarma',
    mobile: '9508112299',
    email: 'diya.sarma@example.com',
    previousPercentage: 88,
    admissionDate: '2026-07-08',
    status: 'active',
    paidThisMonth: true,
  },
];

function buildRoster(): RosterStudent[] {
  return ROSTER_SEED.map((seed) => {
    const classFees = SUBJECT_FEES[seed.classNumber] ?? {};
    const selected = seed.subjects.map((name) => ({
      name,
      monthly_fee: classFees[name] ?? 0,
    }));
    const scholarshipPercent = calculateScholarship(seed.previousPercentage);
    const bill = calculateBill(selected, scholarshipPercent);
    const feeState: StudentFeeState = seed.paidThisMonth ? 'paid' : 'due';

    return {
      id: seed.id,
      registrationNumber: seed.registrationNumber,
      fullName: seed.fullName,
      classNumber: seed.classNumber,
      stream: seed.stream,
      board: seed.board,
      subjects: seed.subjects,
      parentName: seed.parentName,
      mobile: seed.mobile,
      email: seed.email,
      previousPercentage: seed.previousPercentage,
      scholarshipPercent,
      monthlyTuition: bill.monthlyTuition,
      tuitionAfterScholarship: bill.tuitionAfterScholarship,
      mandatoryCharges: bill.mandatoryCharges,
      feeState,
      amountDue: feeState === 'due' ? bill.tuitionAfterScholarship : 0,
      admissionDate: seed.admissionDate,
      status: seed.status,
    };
  });
}

function buildTransactions(roster: RosterStudent[]): Transaction[] {
  // September tuition receipts for everyone who has cleared this month.
  const septemberReceipts: Transaction[] = roster
    .filter((s) => s.feeState === 'paid')
    .map((s, i) => ({
      id: `RCPT-2026-09${String(21 + i).padStart(2, '0')}`,
      date: `2026-09-0${(i % 5) + 2}`,
      studentId: s.id,
      studentName: s.fullName,
      description: `${CURRENT_PERIOD} — Monthly tuition`,
      amount: s.tuitionAfterScholarship,
      method: (['UPI', 'Cash', 'Card', 'Bank Transfer'] as const)[i % 4],
    }));

  // A couple of admission-charge receipts for realism (dated earlier).
  const admissionReceipts: Transaction[] = [
    {
      id: 'RCPT-2026-0902',
      date: '2026-08-31',
      studentId: 'stu-0176',
      studentName: 'Meghna Choudhury',
      description: 'Admission — Exam & T-shirt charges',
      amount: 950,
      method: 'UPI',
    },
    {
      id: 'RCPT-2026-0901',
      date: '2026-08-29',
      studentId: 'stu-0175',
      studentName: 'Kabir Ahmed',
      description: 'Admission — Exam & T-shirt charges',
      amount: 950,
      method: 'Cash',
    },
  ];

  return [...septemberReceipts, ...admissionReceipts].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}

const INSTITUTE_NOTICES: InstituteNotice[] = [
  {
    id: 'in1',
    title: 'Half-Yearly Examination Schedule',
    content:
      'Half-yearly exams for Classes VI–X begin on 22 September 2026. Datesheets are on the notice board and the student portal.',
    date: '2026-08-28',
    audience: 'All',
    pinned: true,
  },
  {
    id: 'in2',
    title: 'September Fee Collection Window',
    content:
      'Monthly tuition for September 2026 is due by the 10th. Please remind guardians with pending dues.',
    date: '2026-08-25',
    audience: 'Staff',
    pinned: true,
  },
  {
    id: 'in3',
    title: 'Parent–Teacher Meeting',
    content:
      'A PTM for all classes is scheduled for 20 September 2026, 10:00 AM at the main campus.',
    date: '2026-08-18',
    audience: 'Parents',
    pinned: false,
  },
  {
    id: 'in4',
    title: 'New Study Material Uploaded',
    content:
      'Chapter-wise practice sheets for Mathematics and Science have been added to the materials library.',
    date: '2026-08-06',
    audience: 'Students',
    pinned: false,
  },
];

// ---------------------------------------------------------------------------
// Admin view
// ---------------------------------------------------------------------------

export interface ClassDistribution {
  classNumber: number;
  count: number;
}

export interface AdminData {
  roster: RosterStudent[];
  pendingAdmissions: RosterStudent[];
  notices: InstituteNotice[];
  classDistribution: ClassDistribution[];
  stats: {
    totalStudents: number;
    activeStudents: number;
    pendingAdmissions: number;
    classesOffered: number;
    monthlyTuitionBilled: number;
  };
  currentPeriod: string;
  isSample: boolean;
}

export function getAdminData(): AdminData {
  const roster = buildRoster();
  const active = roster.filter((s) => s.status === 'active');
  const pendingAdmissions = roster.filter((s) => s.status === 'pending');

  const distributionMap = new Map<number, number>();
  for (const s of roster) {
    distributionMap.set(s.classNumber, (distributionMap.get(s.classNumber) ?? 0) + 1);
  }
  const classDistribution: ClassDistribution[] = [...distributionMap.entries()]
    .map(([classNumber, count]) => ({ classNumber, count }))
    .sort((a, b) => a.classNumber - b.classNumber);

  const monthlyTuitionBilled = active.reduce(
    (sum, s) => sum + s.tuitionAfterScholarship,
    0
  );

  return {
    roster,
    pendingAdmissions,
    notices: INSTITUTE_NOTICES,
    classDistribution,
    stats: {
      totalStudents: roster.length,
      activeStudents: active.length,
      pendingAdmissions: pendingAdmissions.length,
      classesOffered: distributionMap.size,
      monthlyTuitionBilled,
    },
    currentPeriod: CURRENT_PERIOD,
    isSample: true,
  };
}

// ---------------------------------------------------------------------------
// Accountant view
// ---------------------------------------------------------------------------

export interface AccountantData {
  roster: RosterStudent[];
  defaulters: RosterStudent[];
  transactions: Transaction[];
  stats: {
    collectedThisMonth: number;
    pendingDues: number;
    receiptsThisMonth: number;
    defaulterCount: number;
  };
  currentPeriod: string;
  isSample: boolean;
}

export function getAccountantData(): AccountantData {
  const roster = buildRoster();
  const transactions = buildTransactions(roster);

  const septemberTxns = transactions.filter((t) => t.date.startsWith('2026-09'));
  const collectedThisMonth = septemberTxns.reduce((sum, t) => sum + t.amount, 0);
  const defaulters = roster.filter(
    (s) => s.status === 'active' && s.feeState === 'due'
  );
  const pendingDues = defaulters.reduce((sum, s) => sum + s.amountDue, 0);

  return {
    roster,
    defaulters,
    transactions,
    stats: {
      collectedThisMonth,
      pendingDues,
      receiptsThisMonth: septemberTxns.length,
      defaulterCount: defaulters.length,
    },
    currentPeriod: CURRENT_PERIOD,
    isSample: true,
  };
}

/** Human-readable class label, e.g. "Class 11 · Science" or "Class 7". */
export function classLabel(student: {
  classNumber: number;
  stream: string | null;
}): string {
  return student.stream
    ? `Class ${student.classNumber} · ${student.stream}`
    : `Class ${student.classNumber}`;
}

export { formatINR, formatDate } from '@/lib/format';
