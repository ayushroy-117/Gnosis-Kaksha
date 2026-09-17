'use client';

import { LayoutDashboard, BookOpen, Users, FileText } from 'lucide-react';
import { DashboardLayout, type DashboardNavItem } from '@/components/dashboard/DashboardLayout';

const NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Overview', href: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Students', href: '/teacher/students', icon: Users },
  { label: 'Allocations', href: '/teacher/allocations', icon: BookOpen },
  { label: 'Study Material', href: '/teacher/study-material', icon: FileText },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      navItems={NAV_ITEMS}
      roleLabel="Teacher"
      portalName="Teacher Portal"
    >
      {children}
    </DashboardLayout>
  );
}
