import type { UserRole } from '@/lib/auth';

export type Permission =
  | 'view_students'
  | 'approve_admission'
  | 'reject_admission'
  | 'manage_notices'
  | 'view_financials'
  | 'record_payment'
  | 'manage_fee_structure'
  | 'view_allocation_requests'
  | 'approve_allocation'
  | 'reject_allocation'
  | 'create_allocation_request'
  | 'view_own_dashboard'
  | 'create_staff_account';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'view_students',
    'approve_admission',
    'reject_admission',
    'manage_notices',
    'view_financials',
    'view_allocation_requests',
    'create_staff_account',
  ],
  accountant: [
    'view_students',
    'view_financials',
    'record_payment',
    'manage_fee_structure',
    'view_allocation_requests',
    'approve_allocation',
    'reject_allocation',
  ],
  teacher: [
    'view_students',
    'create_allocation_request',
    'view_own_dashboard',
  ],
  student: ['view_own_dashboard'],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
