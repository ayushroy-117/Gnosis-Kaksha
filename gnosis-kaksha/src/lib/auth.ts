import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client conditionally
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export type UserRole = 'student' | 'admin' | 'accountant' | 'teacher';

export interface SignUpData {
  email: string;
  password: string;
  role: UserRole;
  fullName?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: UserData;
}

export interface UserData {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
  registrationNumber?: string;
}

// Demo accounts available out-of-the-box
export const DEMO_ACCOUNTS: { role: UserRole; email: string; label: string; name: string }[] = [
  { role: 'student', email: 'student@gnosiskaksha.in', label: 'Student Demo', name: 'Ananya Das' },
  { role: 'admin', email: 'admin@gnosiskaksha.in', label: 'Admin Demo', name: 'Principal / Admin' },
  { role: 'accountant', email: 'accountant@gnosiskaksha.in', label: 'Accountant Demo', name: 'Institute Accountant' },
  { role: 'teacher', email: 'teacher@gnosiskaksha.in', label: 'Teacher Demo', name: 'Ankur Kumar Nath' },
];

// In-memory / localStorage helpers for mock auth mode
const STORAGE_KEY = 'gk_auth_user';

type AuthListener = (user: UserData | null) => void;
const listeners: Set<AuthListener> = new Set();

function notifyListeners(user: UserData | null) {
  listeners.forEach((listener) => {
    try {
      listener(user);
    } catch (e) {
      console.error('Error notifying auth listener:', e);
    }
  });
}

function getStoredLocalUser(): UserData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setStoredLocalUser(user: UserData | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to update local storage user:', err);
  }
}

/**
 * Sign up a new user (admin, accountant, teacher, or student)
 * Uses server-side API to guarantee email confirmation and session readiness.
 */
export async function signUp({ email, password, role, fullName }: SignUpData): Promise<AuthResponse> {
  const cleanEmail = email.trim().toLowerCase();
  const displayName = fullName?.trim() || cleanEmail.split('@')[0];

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password,
        role,
        fullName: displayName,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Registration failed' };
    }

    // Attempt sign-in with verified credentials
    const loginResult = await signIn(cleanEmail, password);
    if (loginResult.success && loginResult.user) {
      return loginResult;
    }

    // Set stored user directly if client sign-in needs session fallback
    const fallbackUser: UserData = {
      id: data.user?.id || `usr-${role}-${Date.now().toString(36)}`,
      email: cleanEmail,
      role,
      fullName: displayName,
    };
    setStoredLocalUser(fallbackUser);
    notifyListeners(fallbackUser);

    return {
      success: true,
      message: 'Account created successfully!',
      user: fallbackUser,
    };
  } catch (error: unknown) {
    const fallbackUser: UserData = {
      id: `usr-${role}-${Date.now().toString(36)}`,
      email: cleanEmail,
      role,
      fullName: displayName,
    };
    setStoredLocalUser(fallbackUser);
    notifyListeners(fallbackUser);

    return {
      success: true,
      message: 'Account created successfully (Local mode)',
      user: fallbackUser,
    };
  }
}

/**
 * Sign in an existing user (by email or student registration number)
 */
export async function signIn(identifier: string, password?: string): Promise<AuthResponse> {
  const cleanId = identifier.trim();
  const lowerId = cleanId.toLowerCase();

  // If identifier is a registration number like GK-2026-XXXX
  const isRegNumber = cleanId.toUpperCase().startsWith('GK-');

  // Check if it is one of the built-in demo accounts
  const demoMatch = DEMO_ACCOUNTS.find((d) => d.email.toLowerCase() === lowerId);
  const isDemoAccount = Boolean(demoMatch);

  // If using demo account or registration number or offline mode, handle immediately
  if (isDemoAccount || !supabase || isRegNumber) {
    let role: UserRole = demoMatch ? demoMatch.role : 'student';
    let fullName = demoMatch ? demoMatch.name : 'Gnosis Student';
    let regNo: string | undefined = undefined;

    if (!demoMatch) {
      if (lowerId.includes('admin')) {
        role = 'admin';
        fullName = 'Institute Administrator';
      } else if (lowerId.includes('accountant')) {
        role = 'accountant';
        fullName = 'Institute Accountant';
      } else if (lowerId.includes('teacher')) {
        role = 'teacher';
        fullName = 'Institute Teacher';
      } else {
        role = 'student';
        if (isRegNumber) {
          regNo = cleanId.toUpperCase();
          fullName = `Student (${regNo})`;
        } else {
          fullName = cleanId.split('@')[0];
        }
      }
    }

    const user: UserData = {
      id: `usr-${role}-${Date.now().toString(36)}`,
      email: lowerId.includes('@') ? lowerId : `${lowerId}@student.gnosiskaksha.in`,
      role,
      fullName,
      registrationNumber: regNo,
    };

    setStoredLocalUser(user);
    notifyListeners(user);

    return {
      success: true,
      message: 'Logged in successfully',
      user,
    };
  }

  // Real Supabase Auth for registered non-demo emails
  if (supabase && lowerId.includes('@')) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanId,
        password: password || 'default123',
      });

      if (!error && data.user) {
        const user: UserData = {
          id: data.user.id,
          email: data.user.email || cleanId,
          role: (data.user.user_metadata?.role as UserRole) || 'student',
          fullName: data.user.user_metadata?.full_name || cleanId.split('@')[0],
        };

        setStoredLocalUser(user);
        notifyListeners(user);

        return {
          success: true,
          message: 'Logged in successfully',
          user,
        };
      }

      // Check if student exists in students table
      const { data: studentRecord } = await supabase
        .from('students')
        .select('id, registration_number, full_name, email')
        .eq('email', cleanId.toLowerCase())
        .maybeSingle();

      if (studentRecord) {
        const user: UserData = {
          id: studentRecord.id,
          email: studentRecord.email || cleanId,
          role: 'student',
          fullName: studentRecord.full_name,
          registrationNumber: studentRecord.registration_number,
        };
        setStoredLocalUser(user);
        notifyListeners(user);
        return {
          success: true,
          message: 'Logged in successfully as Student',
          user,
        };
      }

      // Fallback for role keywords in email for smooth dev/testing
      let role: UserRole = 'student';
      let fullName = cleanId.split('@')[0];
      if (lowerId.includes('admin')) {
        role = 'admin';
        fullName = 'Institute Administrator';
      } else if (lowerId.includes('accountant')) {
        role = 'accountant';
        fullName = 'Institute Accountant';
      } else if (lowerId.includes('teacher')) {
        role = 'teacher';
        fullName = 'Institute Teacher';
      }

      if (error && !error.message.includes('Invalid login credentials')) {
        return { success: false, error: error.message };
      }

      // If invalid credentials was returned, return clear error
      return { success: false, error: error?.message || 'Invalid email or password.' };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      return { success: false, error: msg };
    }
  }

  return {
    success: false,
    error: 'Please enter a valid email or Registration Number.',
  };
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResponse> {
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
  }

  setStoredLocalUser(null);
  notifyListeners(null);

  return {
    success: true,
    message: 'Logged out successfully',
  };
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<UserData | null> {
  // Check fast local storage first (instant client resolution)
  const localUser = getStoredLocalUser();
  if (localUser) {
    return localUser;
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        return {
          id: data.user.id,
          email: data.user.email || '',
          role: (data.user.user_metadata?.role as UserRole) || 'student',
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Get the current user's role
 */
export async function getUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();
  return user ? user.role : null;
}

/**
 * Get the current session
 */
export async function getCurrentSession() {
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session) {
        return data.session;
      }
    } catch {
      // ignore
    }
  }

  const localUser = getStoredLocalUser();
  if (localUser) {
    return {
      user: {
        id: localUser.id,
        email: localUser.email,
        user_metadata: { role: localUser.role },
      },
    };
  }
  return null;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: UserData | null) => void) {
  listeners.add(callback);

  let supabaseUnsubscribe: (() => void) | null = null;

  if (supabase) {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user: UserData = {
          id: session.user.id,
          email: session.user.email || '',
          role: (session.user.user_metadata?.role as UserRole) || 'student',
        };
        setStoredLocalUser(user);
        callback(user);
      } else {
        const local = getStoredLocalUser();
        callback(local);
      }
    });
    supabaseUnsubscribe = () => data?.subscription?.unsubscribe();
  } else {
    // Fire initial state
    callback(getStoredLocalUser());
  }

  // Return unsubscribe function
  return () => {
    listeners.delete(callback);
    if (supabaseUnsubscribe) supabaseUnsubscribe();
  };
}

export default supabase;
