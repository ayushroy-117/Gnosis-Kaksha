import {
  LayoutDashboard, Users, UserPlus, Megaphone, ShieldCheck, Wallet, Receipt, BarChart3,
  ClipboardCheck, SlidersHorizontal, BookOpen, FileText, CalendarCheck, UserCheck, User, Bell, QrCode, Building2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/lib/permissions';

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface DashboardNavGroup {
  title?: string;
  items: DashboardNavItem[];
}

export const PORTAL: Record<UserRole, { roleLabel: string; portalName: string }> = {
  admin: { roleLabel: 'Admin', portalName: 'Admin Portal' },
  accountant: { roleLabel: 'Accountant', portalName: 'Accountant Portal' },
  teacher: { roleLabel: 'Teacher', portalName: 'Faculty Portal' },
  student: { roleLabel: 'Student', portalName: 'Student Portal' },
};

/**
 * Sidebar per role. The admin sees every area (their access is enforced as a
 * superset on the server) so the menu stays the same wherever they navigate.
 */
export const NAVIGATION: Record<UserRole, DashboardNavGroup[]> = {
  admin: [
    {
      items: [
        { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Students', href: '/admin/students', icon: Users },
        { label: 'Admissions', href: '/admin/admissions', icon: UserPlus },
        { label: 'Notices', href: '/admin/notices', icon: Megaphone },
        { label: 'Accounts & Permissions', href: '/admin/staff', icon: ShieldCheck },
        { label: 'Branches', href: '/admin/branches', icon: Building2 },
        { label: 'Payment Settings', href: '/admin/settings', icon: QrCode },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Payment Queue', href: '/accountant/collections', icon: Wallet },
        { label: 'Transactions', href: '/accountant/transactions', icon: Receipt },
        { label: 'Reports', href: '/accountant/reports', icon: BarChart3 },
        { label: 'Fee Structure', href: '/accountant/fee-structure', icon: SlidersHorizontal },
      ],
    },
    {
      title: 'Academics',
      items: [
        { label: 'Allocations', href: '/accountant/allocations', icon: ClipboardCheck },
        { label: 'Attendance', href: '/teacher/attendance', icon: CalendarCheck },
        { label: 'Study Material', href: '/teacher/study-material', icon: FileText },
      ],
    },
  ],
  accountant: [
    {
      items: [
        { label: 'Overview', href: '/accountant/dashboard', icon: LayoutDashboard },
        { label: 'Collections', href: '/accountant/collections', icon: Wallet },
        { label: 'Transactions', href: '/accountant/transactions', icon: Receipt },
        { label: 'Reports', href: '/accountant/reports', icon: BarChart3 },
        { label: 'Allocations', href: '/accountant/allocations', icon: ClipboardCheck },
        { label: 'Fee Structure', href: '/accountant/fee-structure', icon: SlidersHorizontal },
      ],
    },
  ],
  teacher: [
    {
      items: [
        { label: 'Overview', href: '/teacher/dashboard', icon: LayoutDashboard },
        { label: 'Attendance', href: '/teacher/attendance', icon: CalendarCheck },
        { label: 'Students', href: '/teacher/students', icon: Users },
        { label: 'Allocations', href: '/teacher/allocations', icon: BookOpen },
        { label: 'Study Material', href: '/teacher/study-material', icon: FileText },
        { label: 'Teacher Profile', href: '/teacher/profile', icon: UserCheck },
      ],
    },
  ],
  student: [
    {
      items: [
        { label: 'Overview', href: '/student/dashboard', icon: LayoutDashboard },
        { label: 'Profile', href: '/student/profile', icon: User },
        { label: 'My Courses', href: '/student/courses', icon: BookOpen },
        { label: 'Study Material', href: '/student/study-material', icon: FileText },
        { label: 'Fees', href: '/student/fees', icon: Wallet },
        { label: 'Notices', href: '/student/notices', icon: Bell },
      ],
    },
  ],
};
