/** Salary records as returned by /api/salaries (shared by the accountant and teacher portals). */

export interface SalaryLine {
  label: string;
  amount: number;
}

export interface SalaryPayment {
  id: string;
  userId: string;
  staffName: string;
  staffCode: string;
  designation: string;
  department: string | null;
  subjects: string | null;
  dateOfJoining: string | null;
  photoUrl: string | null;
  /** YYYY-MM */
  period: string;
  earnings: SalaryLine[];
  deductions: SalaryLine[];
  gross: number;
  totalDeduction: number;
  net: number;
  status: 'pending' | 'paid';
  paymentDate: string | null;
  paymentMode: string | null;
  reference: string | null;
  receiptNumber: string;
  note: string | null;
  preparedBy: string | null;
  bankName: string | null;
  bankAccountMasked: string | null;
}

export const PAYMENT_MODES = ['Bank Transfer', 'UPI', 'Cash', 'Cheque'] as const;

/** Suggested particulars for a new salary record (the accountant edits freely). */
export const DEFAULT_EARNINGS = ['Basic Salary', 'Performance Incentive', 'Approved Leave Adjustment', 'Festival / Welfare Contribution'];
export const DEFAULT_DEDUCTIONS = ['Advance', 'Half Day / Late Coming', 'Unpaid Leave'];

export function periodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export const maskAccount = (acc: string | null) => (acc ? `${'X'.repeat(Math.max(0, acc.length - 4))}${acc.slice(-4)}` : null);
