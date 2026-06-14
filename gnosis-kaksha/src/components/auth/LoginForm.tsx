'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSwitchToRegister?: () => void;
  onLoginSuccess?: () => void;
}

export function LoginForm({ onSwitchToRegister, onLoginSuccess }: LoginFormProps) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setGeneralError(null);
    
    try {
      const result = await signIn(data.email, data.password);
      
      if (!result.success) {
        setGeneralError(result.error || 'Login failed. Please try again.');
        return;
      }

      // Redirect to dashboard (role-based redirection will happen in middleware)
      onLoginSuccess?.();
      router.push('/teacher/dashboard');
      
    } catch (error: any) {
      setGeneralError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {generalError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{generalError}</p>
        </div>
      )}

      <Input
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register('password')}
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        isLoading={isLoading}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-[#1295D8] hover:underline font-medium"
        >
          Create one
        </button>
      </p>
    </form>
  );
}
