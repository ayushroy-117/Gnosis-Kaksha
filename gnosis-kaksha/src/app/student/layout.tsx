'use client';

import { LayoutDashboard, User, BookOpen, Wallet, Bell } from 'lucide-react';
import { DashboardLayout, type DashboardNavItem } from '@/components/dashboard/DashboardLayout';

const NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Overview', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Profile', href: '/student/profile', icon: User },
  { label: 'My Courses', href: '/student/courses', icon: BookOpen },
  { label: 'Fees', href: '/student/fees', icon: Wallet },
  { label: 'Notices', href: '/student/notices', icon: Bell },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Student" portalName="Student Portal">
      {children}
    </DashboardLayout>
  );
}
