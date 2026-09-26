'use client';

import { useState } from 'react';
import { UserPlus, Shield, Calculator, BookOpen } from 'lucide-react';
import { SampleDataBanner } from '@/components/dashboard/SampleDataBanner';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { signUp } from '@/lib/auth';
import toast from 'react-hot-toast';

interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'accountant' | 'teacher';
  createdAt: string;
}

const DEMO_STAFF: StaffAccount[] = [
  {
    id: 'staff-001',
    name: 'Principal / Admin',
    email: 'admin@gnosiskaksha.in',
    role: 'admin',
    createdAt: '2026-06-01',
  },
  {
    id: 'staff-002',
    name: 'Institute Accountant',
    email: 'accountant@gnosiskaksha.in',
    role: 'accountant',
    createdAt: '2026-06-01',
  },
  {
    id: 'staff-003',
    name: 'Ankur Kumar Nath',
    email: 'teacher@gnosiskaksha.in',
    role: 'teacher',
    createdAt: '2026-06-01',
  },
];

const ROLE_ICON: Record<string, React.ReactNode> = {
  admin: <Shield size={18} className="text-[#2E5EAA]" />,
  accountant: <Calculator size={18} className="text-[#10B981]" />,
  teacher: <BookOpen size={18} className="text-[#F59E0B]" />,
};

const ROLE_TONE: Record<string, 'blue' | 'green' | 'amber'> = {
  admin: 'blue',
  accountant: 'green',
  teacher: 'amber',
};

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffAccount[]>(DEMO_STAFF);
  const [form, setForm] = useState({ name: '', email: '', role: 'teacher' as 'admin' | 'accountant' | 'teacher', password: '' });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Please fill all required fields.');
      return;
    }
    setIsCreating(true);
    try {
      const result = await signUp({
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        fullName: form.name.trim(),
      });
      if (result.success) {
        const newStaff: StaffAccount = {
          id: `staff-${Date.now().toString(36)}`,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setStaff((prev) => [newStaff, ...prev]);
        setForm({ name: '', email: '', role: 'teacher', password: '' });
        toast.success(`${form.role.charAt(0).toUpperCase() + form.role.slice(1)} account created!`);
      } else {
        toast.error(result.error || 'Failed to create account.');
      }
    } catch {
      toast.error('Unexpected error creating account.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <SampleDataBanner />

      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Staff Accounts</h1>
        <p className="mt-1 text-[#4A5568]">
          Create and manage admin, accountant, and teacher accounts. Students self-register.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create form */}
        <div className="lg:col-span-1">
          <SectionCard title="Create Staff Account" description="Admin-only action">
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="e.g. Priya Sharma"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="e.g. teacher@gnosiskaksha.in"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
              <Select
                label="Role"
                options={[
                  { value: 'teacher', label: 'Teacher' },
                  { value: 'accountant', label: 'Accountant' },
                  { value: 'admin', label: 'Admin' },
                ]}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof form.role }))}
              />
              <Input
                label="Temporary Password"
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isCreating}
              >
                <UserPlus size={16} className="mr-1" />
                Create Account
              </Button>
            </form>
          </SectionCard>
        </div>

        {/* Staff list */}
        <div className="lg:col-span-2">
          <SectionCard title="Staff Roster" bodyClassName="p-0">
            <ul className="divide-y divide-gray-100">
              {staff.map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7]">
                    {ROLE_ICON[s.role]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#1A2B4A]">{s.name}</p>
                    <p className="text-xs text-[#718096]">{s.email} · Since {s.createdAt}</p>
                  </div>
                  <Badge tone={ROLE_TONE[s.role]}>
                    {s.role.charAt(0).toUpperCase() + s.role.slice(1)}
                  </Badge>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
