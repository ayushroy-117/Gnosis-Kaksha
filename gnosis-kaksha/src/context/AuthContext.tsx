'use client';

import { createContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { fetchMe, signIn as authSignIn, signOut as authSignOut, UserData, AuthResponse } from '@/lib/auth';
import type { Permission } from '@/lib/permissions';

interface AuthContextType {
  user: UserData | null;
  permissions: Permission[];
  loading: boolean;
  isAuthenticated: boolean;
  can: (permission: Permission) => boolean;
  signIn: (identifier: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    setUser(me.user);
    setPermissions(me.permissions);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = async (identifier: string, password: string) => {
    const result = await authSignIn(identifier, password);
    if (result.success) await refresh();
    return result;
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
    setPermissions([]);
  };

  const value: AuthContextType = {
    user,
    permissions,
    loading,
    isAuthenticated: !!user,
    can: (p) => permissions.includes(p),
    signIn,
    signOut,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
