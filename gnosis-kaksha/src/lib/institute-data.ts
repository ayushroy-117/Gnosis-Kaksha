import {
  EnrollmentStatus,
  StudentFeeState,
  RosterStudent,
  Transaction,
  InstituteNotice,
  getAllStudents,
  getAllTransactions,
  getAllNotices,
} from '@/lib/institute-store';

export type {
  EnrollmentStatus,
  StudentFeeState,
  RosterStudent,
  Transaction,
  InstituteNotice,
};

// The month the current period is framed around (matches the academic cycle).
const CURRENT_PERIOD = 'September 2026';

function buildRoster(): RosterStudent[] {
  return getAllStudents();
}

function buildTransactions(): Transaction[] {
  return getAllTransactions();
}

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
    notices: getAllNotices(),
    classDistribution,
    stats: {
      totalStudents: roster.length,
      activeStudents: active.length,
      pendingAdmissions: pendingAdmissions.length,
      classesOffered: distributionMap.size,
      monthlyTuitionBilled,
    },
    currentPeriod: CURRENT_PERIOD,
    isSample: false,
  };
}

// ---------------------------------------------------------------------------
// Accountant view
// ---------------------------------------------------------------------------

export interface AccountantData {
  roster: RosterStudent[];
  defaulters: RosterStudent[];
  transactions: Transaction[];
  pendingVerifications: Transaction[]; // UPI payments awaiting accountant approval
  stats: {
    collectedThisMonth: number;
    pendingDues: number;
    receiptsThisMonth: number;
    defaulterCount: number;
    pendingVerificationCount: number;
  };
  currentPeriod: string;
  isSample: boolean;
}

export function getAccountantData(): AccountantData {
  const roster = buildRoster();
  const transactions = buildTransactions();

  const septemberTxns = transactions.filter((t) => t.date.startsWith('2026-09'));
  const collectedThisMonth = septemberTxns
    .filter((t) => t.status === 'verified')
    .reduce((sum, t) => sum + t.amount, 0);
  const defaulters = roster.filter(
    (s) => s.status === 'active' && s.feeState === 'due'
  );
  const pendingDues = defaulters.reduce((sum, s) => sum + s.amountDue, 0);
  const pendingVerifications = transactions.filter((t) => t.status === 'pending' && t.method === 'UPI' && t.upiReference);

  return {
    roster,
    defaulters,
    transactions,
    pendingVerifications,
    stats: {
      collectedThisMonth,
      pendingDues,
      receiptsThisMonth: septemberTxns.filter((t) => t.status === 'verified').length,
      defaulterCount: defaulters.length,
      pendingVerificationCount: pendingVerifications.length,
    },
    currentPeriod: CURRENT_PERIOD,
    isSample: false,
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
