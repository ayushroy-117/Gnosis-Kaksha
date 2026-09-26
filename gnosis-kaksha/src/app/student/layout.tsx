'use client';

import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { LoadingState } from '@/components/dashboard/PageState';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout area="student">
      {/* Student pages read ?as= (admin viewing a student's portal) */}
      <Suspense fallback={<LoadingState />}>{children}</Suspense>
    </DashboardLayout>
  );
}
