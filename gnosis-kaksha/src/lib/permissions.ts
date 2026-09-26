/**
 * Permission matrix — the single source of truth for who may do what.
 * Enforced server-side by `requirePermission` in `@/lib/authz`; the UI uses
 * the same table only to decide what to show.
 *
 * Admin is a superset role: `hasPermission('admin', anything)` is always true.
 * The other roles are least-privilege.
 */

export type UserRole = 'student' | 'teacher' | 'accountant' | 'admin';

export const ROLES: UserRole[] = ['student', 'teacher', 'accountant', 'admin'];

export type Permission =
  // Students
  | 'view_own_portal'          // student: own profile, fees, notices, materials
  | 'submit_payment'           // student: submit UPI transaction ID for own dues
  | 'view_student_roster'      // name, reg no, class, subjects — no fees/scholarship
  | 'view_student_records'     // full student record incl. fees & contact details
  | 'manage_admissions'        // approve / reject admission applications
  // Money
  | 'view_financials'          // ledger, transactions, reports, dues
  | 'review_payments'          // approve / reject pending UPI submissions
  | 'record_payment'           // record cash / counter payments
  | 'send_fee_reminders'       // WhatsApp reminders
  // Academics
  | 'view_allocations'
  | 'request_allocation'       // teacher asks for a subject to be added
  | 'resolve_allocation'       // approve / reject that request
  | 'mark_attendance'
  | 'manage_study_material'
  | 'download_study_material'
  // Administration
  | 'manage_notices'
  | 'manage_payment_settings'  // institute UPI payee used in payment QR codes
  | 'manage_branches'          // add / rename / deactivate branches
  | 'manage_accounts';         // create staff, change roles, deactivate

const MATRIX: Record<Exclude<UserRole, 'admin'>, Permission[]> = {
  student: ['view_own_portal', 'submit_payment', 'download_study_material'],
  teacher: [
    'view_student_roster',
    'view_allocations',
    'request_allocation',
    'mark_attendance',
    'manage_study_material',
    'download_study_material',
  ],
  accountant: [
    'view_student_roster',
    'view_student_records',
    'view_financials',
    'review_payments',
    'record_payment',
    'send_fee_reminders',
    'view_allocations',
    'resolve_allocation',
    'download_study_material',
  ],
};

export const ALL_PERMISSIONS: Permission[] = [
  'view_own_portal', 'submit_payment', 'view_student_roster', 'view_student_records',
  'manage_admissions', 'view_financials', 'review_payments', 'record_payment',
  'send_fee_reminders', 'view_allocations', 'request_allocation', 'resolve_allocation',
  'mark_attendance', 'manage_study_material', 'download_study_material',
  'manage_notices', 'manage_payment_settings', 'manage_branches', 'manage_accounts',
];

export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  if (role === 'admin') return true;
  return MATRIX[role]?.includes(permission) ?? false;
}

export function getPermissions(role: UserRole): Permission[] {
  if (role === 'admin') return [...ALL_PERMISSIONS];
  return [...(MATRIX[role] ?? [])];
}

/** Which dashboard areas a role may open. Admin may open all of them. */
export const AREA_ROLES: Record<string, UserRole[]> = {
  '/admin': ['admin'],
  '/accountant': ['accountant', 'admin'],
  '/teacher': ['teacher', 'admin'],
  '/student': ['student', 'admin'],
};

export function homeFor(role: UserRole): string {
  return `/${role}/dashboard`;
}

/** Roles that public self-service flows may ever create. */
export const SELF_SERVICE_ROLES: UserRole[] = ['student'];

/** Roles an admin may assign to other accounts (never a second admin). */
export const ASSIGNABLE_ROLES: UserRole[] = ['student', 'teacher', 'accountant'];
