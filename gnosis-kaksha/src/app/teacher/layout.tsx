'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout area="teacher">{children}</DashboardLayout>;
}
