'use client';

import { LayoutDashboard, Users, UserPlus, Megaphone } from 'lucide-react';
import { DashboardLayout, type DashboardNavItem } from '@/components/dashboard/DashboardLayout';

const NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Students', href: '/admin/students', icon: Users },
  { label: 'Admissions', href: '/admin/admissions', icon: UserPlus },
  { label: 'Notices', href: '/admin/notices', icon: Megaphone },
  { label: 'Staff Accounts', href: '/admin/staff', icon: UserPlus },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navItems={NAV_ITEMS} roleLabel="Admin" portalName="Admin Portal">
      {children}
    </DashboardLayout>
  );
}
