import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client conditionally
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export type UserRole = 'student' | 'admin' | 'accountant';

export interface SignUpData {
  email: string;
  password: string;
  role: 'admin' | 'accountant';
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
 * Sign up a new user
 */
export async function signUp({ email, password, role }: SignUpData): Promise<AuthResponse> {
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role },
        },
      });

      if (error) return { success: false, error: error.message };
      if (!data.user) return { success: false, error: 'User creation failed' };

      return {
        success: true,
        message: 'Account created successfully. Please check your email to confirm.',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      return {
        success: false,
        error: msg,
      };
    }
  }

  // Fallback Mock Sign-Up
  const newUser: UserData = {
    id: `usr-${Date.now().toString(36)}`,
    email: email.trim().toLowerCase(),
    role,
    fullName: email.split('@')[0],
  };

  setStoredLocalUser(newUser);
  notifyListeners(newUser);

  return {
    success: true,
    message: 'Account created successfully!',
    user: newUser,
  };
}

/**
 * Sign in an existing user (by email or student registration number)
 */
export async function signIn(identifier: string, password?: string): Promise<AuthResponse> {
  const cleanId = identifier.trim();
  const lowerId = cleanId.toLowerCase();

  // If identifier is a registration number like GK-2026-XXXX
  const isRegNumber = cleanId.toUpperCase().startsWith('GK-');

  if (supabase && !isRegNumber && lowerId.includes('@')) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanId,
        password: password || 'default123',
      });

      if (error) return { success: false, error: error.message };
      if (!data.user) return { success: false, error: 'Login failed' };

      const user: UserData = {
        id: data.user.id,
        email: data.user.email || cleanId,
        role: (data.user.user_metadata?.role as UserRole) || 'student',
      };

      setStoredLocalUser(user);
      notifyListeners(user);

      return {
        success: true,
        message: 'Logged in successfully',
        user,
      };
    } catch (error: unknown) {
      // Fall through to mock if Supabase fails (e.g. network/credentials invalid)
      console.warn('Supabase sign-in failed, checking mock credentials:', error);
    }
  }

  // Mock / Offline Auth Mode
  let role: UserRole = 'student';
  let fullName = 'Gnosis Student';
  let regNo: string | undefined = undefined;

  if (lowerId.includes('admin') || lowerId === 'admin@gnosiskaksha.in') {
    role = 'admin';
    fullName = 'Institute Administrator';
  } else if (lowerId.includes('accountant') || lowerId === 'accountant@gnosiskaksha.in') {
    role = 'accountant';
    fullName = 'Institute Accountant';
  } else {
    role = 'student';
    if (isRegNumber) {
      regNo = cleanId.toUpperCase();
      fullName = `Student (${regNo})`;
    } else {
      fullName = cleanId.split('@')[0];
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

  return getStoredLocalUser();
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
