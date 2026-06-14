'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/hooks/useAuth';

// Validation schema
const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Confirm password is required'),
  role: z.enum(['teacher', 'admin']).refine(val => val, { message: 'Please select a role' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
  onRegisterSuccess?: () => void;
}

export function RegisterForm({ onSwitchToLogin, onRegisterSuccess }: RegisterFormProps) {
  const router = useRouter();
  const { signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setGeneralError(null);
    
    try {
      const result = await signUp(data.email, data.password, data.role);
      
      if (!result.success) {
        setGeneralError(result.error || 'Registration failed. Please try again.');
        return;
      }

      // Redirect to appropriate dashboard
      onRegisterSuccess?.();
      if (data.role === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/admin/dashboard');
      }
      
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

      <Select
        label="Role"
        error={errors.role?.message}
        options={[
          { value: 'teacher', label: 'Teacher' },
          { value: 'admin', label: 'Admin' },
        ]}
        {...register('role')}
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register('password')}
      />

      <Input
        label="Confirm Password"
        type="password"
        placeholder="••••••••"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        isLoading={isLoading}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-[#1295D8] hover:underline font-medium"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
