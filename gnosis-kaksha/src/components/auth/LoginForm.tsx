'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or registration number (e.g. GK-2026-0142)'),
  password: z.string().min(1, 'Enter your password'),
});

type LoginFormData = z.infer<typeof loginSchema>;

/** Only allow same-site, in-app redirects from ?next= */
function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setGeneralError(null);
    const result = await signIn(data.identifier, data.password);
    if (!result.success) {
      setGeneralError(result.error || 'Sign-in failed. Please try again.');
      return;
    }
    router.push(safeNext(searchParams.get('next')) || result.redirectTo || '/');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <h1 className="text-2xl font-bold text-[#1A2B4A]">Sign in</h1>
        <p className="mt-1 text-sm text-[#4A5568]">
          Students can use their registration number or email. Staff use their institute email.
        </p>
      </div>

      {generalError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{generalError}</p>
        </div>
      )}

      <Input
        label="Email or Student Reg. No"
        placeholder="e.g. GK-2026-0142 or you@example.com"
        autoComplete="username"
        error={errors.identifier?.message}
        {...register('identifier')}
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} className="w-full">
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </Button>

      <p className="text-center text-xs text-gray-500">
        Forgot your password? Contact the institute office to have it reset.
      </p>
    </form>
  );
}
