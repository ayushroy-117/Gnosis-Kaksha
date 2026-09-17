'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { getUserRole } from '@/lib/auth';
import { GraduationCap, Shield, Calculator, Zap, BookOpen } from 'lucide-react';

// Allow email OR registration number (e.g., GK-2026-0142)
const loginSchema = z.object({
  identifier: z.string().min(3, 'Enter valid email or Registration No (e.g. GK-2026-0142)'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
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
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const handleLogin = async (identifier: string, pass: string) => {
    try {
      const result = await signIn(identifier, pass);
      
      if (!result.success) {
        setGeneralError(result.error || 'Login failed. Please try again.');
        return;
      }

      onLoginSuccess?.();
      const role = await getUserRole();
      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else if (role === 'accountant') {
        router.push('/accountant/dashboard');
      } else if (role === 'teacher') {
        router.push('/teacher/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'An unexpected error occurred';
      setGeneralError(msg);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setGeneralError(null);
    await handleLogin(data.identifier, data.password);
    setIsLoading(false);
  };

  const handleDemoLogin = async (email: string, role: string) => {
    setDemoLoading(role);
    setGeneralError(null);
    await handleLogin(email, 'demo123');
    setDemoLoading(null);
  };

  return (
    <div className="space-y-6">
      {/* 1-Click Demo Logins */}
      <div className="rounded-xl border border-[#CDE6F7] bg-[#F0F7FD] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-[#1295D8]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#2E5EAA]">
            1-Click Demo Login
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => handleDemoLogin('student@gnosiskaksha.in', 'student')}
            disabled={isLoading || !!demoLoading}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-white border border-[#CDE6F7] hover:border-[#1295D8] hover:bg-[#EBF5FB] transition shadow-xs group"
          >
            <GraduationCap size={20} className="text-[#1295D8] mb-1 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-[#1A2B4A]">Student</span>
            <span className="text-[10px] text-gray-500">Learner Portal</span>
          </button>

          <button
            type="button"
            onClick={() => handleDemoLogin('admin@gnosiskaksha.in', 'admin')}
            disabled={isLoading || !!demoLoading}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-white border border-[#CDE6F7] hover:border-[#1295D8] hover:bg-[#EBF5FB] transition shadow-xs group"
          >
            <Shield size={20} className="text-[#2E5EAA] mb-1 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-[#1A2B4A]">Admin</span>
            <span className="text-[10px] text-gray-500">Admissions &amp; Ops</span>
          </button>

          <button
            type="button"
            onClick={() => handleDemoLogin('accountant@gnosiskaksha.in', 'accountant')}
            disabled={isLoading || !!demoLoading}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-white border border-[#CDE6F7] hover:border-[#1295D8] hover:bg-[#EBF5FB] transition shadow-xs group"
          >
            <Calculator size={20} className="text-[#10B981] mb-1 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-[#1A2B4A]">Accountant</span>
            <span className="text-[10px] text-gray-500">Fees &amp; Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => handleDemoLogin('teacher@gnosiskaksha.in', 'teacher')}
            disabled={isLoading || !!demoLoading}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-white border border-[#CDE6F7] hover:border-[#1295D8] hover:bg-[#EBF5FB] transition shadow-xs group"
          >
            <BookOpen size={20} className="text-[#F59E0B] mb-1 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-[#1A2B4A]">Teacher</span>
            <span className="text-[10px] text-gray-500">Class Portal</span>
          </button>
        </div>
        {demoLoading && (
          <p className="text-xs text-center text-[#1295D8] mt-2 animate-pulse">
            Logging in as {demoLoading}...
          </p>
        )}
      </div>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-gray-200 w-full" />
        <span className="bg-white px-3 text-xs text-gray-400 uppercase font-medium">Or Sign In with Credentials</span>
        <div className="border-t border-gray-200 w-full" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {generalError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{generalError}</p>
          </div>
        )}

        <Input
          label="Email or Student Reg. No"
          placeholder="e.g. GK-2026-0142 or email"
          error={errors.identifier?.message}
          {...register('identifier')}
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
          disabled={isLoading || !!demoLoading}
          className="w-full"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-[#1295D8] hover:underline font-medium"
          >
            Create Staff Account
          </button>
        </p>
      </form>
    </div>
  );
}
