'use client';

import { LayoutDashboard, BookOpen, Users, FileText, CalendarCheck, UserCheck } from 'lucide-react';
import { DashboardLayout, type DashboardNavItem } from '@/components/dashboard/DashboardLayout';

const NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Overview', href: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Attendance', href: '/teacher/attendance', icon: CalendarCheck },
  { label: 'Students', href: '/teacher/students', icon: Users },
  { label: 'Allocations', href: '/teacher/allocations', icon: BookOpen },
  { label: 'Study Material', href: '/teacher/study-material', icon: FileText },
  { label: 'Teacher Profile', href: '/teacher/profile', icon: UserCheck },
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
