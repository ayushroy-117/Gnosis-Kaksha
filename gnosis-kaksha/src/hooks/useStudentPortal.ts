'use client';

import { useSearchParams } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import type { StudentData } from '@/lib/student-data';

/**
 * Loads the student portal payload. Students get their own record; the admin
 * views any student's portal by adding `?as=<studentId>` (links from
 * Admin → Students). `withAs(href)` keeps that parameter on in-portal links.
 */
export function useStudentPortal() {
  const as = useSearchParams().get('as');
  const url = as ? `/api/data/student?as=${encodeURIComponent(as)}` : '/api/data/student';
  const state = useApi<StudentData>(url);
  const withAs = (href: string) => (as ? `${href}${href.includes('?') ? '&' : '?'}as=${encodeURIComponent(as)}` : href);
  return { ...state, viewingAs: as, withAs };
}
