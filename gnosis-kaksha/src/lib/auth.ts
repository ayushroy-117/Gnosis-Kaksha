/**
 * Client-side auth helpers. The session is an httpOnly cookie managed by the
 * server (@supabase/ssr); nothing about identity or role is stored in the
 * browser. The role shown here is informational — every permission is
 * enforced again on the server.
 */
import type { Permission, UserRole } from '@/lib/permissions';

export type { UserRole } from '@/lib/permissions';

export interface UserData {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  studentId: string | null;
  registrationNumber: string | null;
  /** Staff branch (null = all branches) or, for students, their record's branch. */
  branchId: string | null;
  branchName: string | null;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: UserData;
  redirectTo?: string;
}

export interface MeResponse {
  user: UserData | null;
  permissions: Permission[];
}

export async function fetchMe(): Promise<MeResponse> {
  try {
    const res = await fetch('/api/auth/me', { cache: 'no-store' });
    if (!res.ok) return { user: null, permissions: [] };
    return (await res.json()) as MeResponse;
  } catch {
    return { user: null, permissions: [] };
  }
}

export async function signIn(identifier: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Sign-in failed. Please try again.' };
    }
    return { success: true, user: data.user, redirectTo: data.redirectTo };
  } catch {
    return { success: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

export async function signOut(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // The cookie expires on its own; nothing else to clean up client-side.
  }
}
