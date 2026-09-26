'use client';

import { createContext, useEffect, useState, ReactNode } from 'react';
import {
  getCurrentUser,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
  onAuthStateChange,
  UserRole,
  UserData,
} from '@/lib/auth';


interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, role: UserRole, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current user on mount
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    checkUser();

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((newUser) => {
      setUser(newUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password?: string) => {
    const result = await authSignIn(email, password);
    
    if (result.success) {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    }

    return {
      success: result.success,
      error: result.error,
    };
  };

  const signUp = async (email: string, password: string, role: UserRole, fullName?: string) => {
    const result = await authSignUp({ email, password, role, fullName });

    if (result.success) {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    }

    return {
      success: result.success,
      error: result.error,
    };
  };

  const signOut = async () => {
    const result = await authSignOut();
    if (result.success) {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
