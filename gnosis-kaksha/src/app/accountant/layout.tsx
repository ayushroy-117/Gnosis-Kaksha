'use client';

import { LayoutDashboard, Wallet, Receipt, BarChart3, ClipboardCheck, SlidersHorizontal } from 'lucide-react';
import { DashboardLayout, type DashboardNavItem } from '@/components/dashboard/DashboardLayout';

const NAV_ITEMS: DashboardNavItem[] = [
  { label: 'Overview', href: '/accountant/dashboard', icon: LayoutDashboard },
  { label: 'Collections', href: '/accountant/collections', icon: Wallet },
  { label: 'Transactions', href: '/accountant/transactions', icon: Receipt },
  { label: 'Reports', href: '/accountant/reports', icon: BarChart3 },
  { label: 'Allocations', href: '/accountant/allocations', icon: ClipboardCheck },
  { label: 'Fee Structure', href: '/accountant/fee-structure', icon: SlidersHorizontal },
];

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      navItems={NAV_ITEMS}
      roleLabel="Accountant"
      portalName="Accountant Portal"
    >
      {children}
    </DashboardLayout>
  );
}
