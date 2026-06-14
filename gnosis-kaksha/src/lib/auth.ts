import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'teacher' | 'admin' | 'student';

interface SignUpData {
  email: string;
  password: string;
  role: 'teacher' | 'admin';
}

interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface UserData {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Sign up a new user (Teacher or Admin)
 */
export async function signUp({ email, password, role }: SignUpData): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'User creation failed',
      };
    }

    return {
      success: true,
      message: 'Account created successfully. Please check your email to confirm.',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Sign in an existing user
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Login failed',
      };
    }

    return {
      success: true,
      message: 'Logged in successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'Logged out successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser(): Promise<UserData | null> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    const role = (data.user.user_metadata?.role as UserRole) || 'student';

    return {
      id: data.user.id,
      email: data.user.email || '',
      role,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get the current user's role
 */
export async function getUserRole(): Promise<UserRole | null> {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return null;
    }

    return (data.user.user_metadata?.role as UserRole) || 'student';
  } catch (error) {
    return null;
  }
}

/**
 * Get the current session
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      return null;
    }

    return data.session;
  } catch (error) {
    return null;
  }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: UserData | null) => void) {
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const role = (session.user.user_metadata?.role as UserRole) || 'student';
      callback({
        id: session.user.id,
        email: session.user.email || '',
        role,
      });
    } else {
      callback(null);
    }
  });

  // Return unsubscribe function
  return () => {
    data?.subscription?.unsubscribe();
  };
}

export default supabase;
