'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/dashboard/Badge';
import { LoadingState } from '@/components/dashboard/PageState';
import { NAVIGATION, PORTAL, type DashboardNavGroup } from '@/components/dashboard/navigation';
import type { UserRole } from '@/lib/permissions';

export type { DashboardNavItem } from '@/components/dashboard/navigation';

interface DashboardLayoutProps {
  /** The dashboard area being rendered (/admin, /accountant, ...). */
  area: UserRole;
  children: React.ReactNode;
}

function NavLinks({
  groups,
  pathname,
  onItemClick,
}: {
  groups: DashboardNavGroup[];
  pathname: string;
  onItemClick?: () => void;
}) {
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex flex-col gap-4 overflow-y-auto">
      {groups.map((group, i) => (
        <div key={group.title ?? i} className="flex flex-col gap-1">
          {group.title && (
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#718096]">
              {group.title}
            </p>
          )}
          {group.items.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onItemClick}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-[#1295D8] text-white shadow-xs'
                    : 'text-[#4A5568] hover:bg-[#CDE6F7] hover:text-[#2E5EAA]'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function DashboardLayout({ area, children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // The proxy already redirects signed-out visitors server-side; this covers a
  // session that expires while the page is open.
  useEffect(() => {
    if (!loading && !user) {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="bg-[#F7FAFC]">
        <LoadingState />
      </div>
    );
  }

  if (!user) return null;

  // Admin keeps the full admin menu in every area it can open.
  const navRole: UserRole = user.role === 'admin' ? 'admin' : area;
  const groups = NAVIGATION[navRole];
  const { portalName } = PORTAL[area];
  const { roleLabel } = PORTAL[user.role];

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7FAFC] print:bg-white print:min-h-0">
      <div className="mx-auto flex max-w-7xl print:max-w-none print:m-0 print:p-0 print:block">
        {/* Desktop sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-r border-gray-200 bg-white px-4 py-6 md:flex print:hidden">
          <div className="mb-6 px-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
              {portalName}
            </p>
            <p className="mt-0.5 text-lg font-bold text-[#1A2B4A]">Gnosis Kaksha</p>
          </div>
          <NavLinks groups={groups} pathname={pathname} />
          <div className="mt-auto pt-6">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#4A5568] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <LogOut size={18} />
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col print:block print:w-full">
          {/* Topbar */}
          <div className="sticky top-16 z-30 flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 md:px-6 print:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-md p-1.5 text-[#4A5568] transition hover:bg-gray-100 md:hidden"
                aria-label="Open menu"
              >
                <Menu size={22} />
              </button>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-[#1A2B4A]">{portalName}</p>
                <p className="hidden text-xs text-[#718096] sm:block">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone="blue">{roleLabel}</Badge>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="hidden items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#4A5568] transition hover:bg-gray-50 disabled:opacity-50 sm:flex"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>

          <main className="flex-1 px-4 py-6 md:px-6 md:py-8 print:p-0 print:m-0 print:w-full">{children}</main>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-white px-4 py-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between px-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#718096]">
                  {portalName}
                </p>
                <p className="mt-0.5 text-lg font-bold text-[#1A2B4A]">Gnosis Kaksha</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-[#4A5568] transition hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <NavLinks
              groups={groups}
              pathname={pathname}
              onItemClick={() => setMobileOpen(false)}
            />
            <div className="mt-auto pt-6">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#4A5568] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <LogOut size={18} />
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
