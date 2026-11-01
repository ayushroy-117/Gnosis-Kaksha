/** Staff leave policy and calculations (shared by the API and the leave pages). */

export type LeaveType = 'casual' | 'sick' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const LEAVE_TYPES: Record<LeaveType, string> = { casual: 'Casual Leave', sick: 'Sick Leave', unpaid: 'Unpaid Leave' };

/** Casual leave allowed per calendar year. */
export const CASUAL_PER_YEAR = 12;

export const LEAVE_POLICY = [
  `Total ${CASUAL_PER_YEAR} days of casual leave per year.`,
  'Leave is subject to management approval.',
  'Apply at least 1 day in advance (sick leave may be applied the same day).',
  'A half day counts as 0.5 day.',
  'Sundays inside a leave period are not counted.',
  'Leave beyond your casual balance should be applied as unpaid leave.',
];

export interface LeaveRequest {
  id: string;
  userId: string;
  staffName?: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  halfDay: boolean;
  days: number;
  reason: string;
  documentUrl: string | null;
  status: LeaveStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
}

/** Working days from..to inclusive (YYYY-MM-DD), Sundays excluded; a half day is 0.5. */
export function countLeaveDays(from: string, to: string, halfDay: boolean): number {
  if (halfDay) return 0.5;
  let days = 0;
  const end = new Date(`${to}T00:00:00Z`);
  for (const d = new Date(`${from}T00:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0) days += 1;
  }
  return days;
}

/** Each date (YYYY-MM-DD) a leave covers, for calendars. */
export function leaveDates(from: string, to: string): string[] {
  const out: string[] = [];
  const end = new Date(`${to}T00:00:00Z`);
  for (const d = new Date(`${from}T00:00:00Z`); d <= end && out.length < 400; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
