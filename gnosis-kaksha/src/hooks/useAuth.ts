'use client';

import { useCallback, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

/**
 * Hook to access auth context
 * Must be used within AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
