'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout area="accountant">{children}</DashboardLayout>;
}
