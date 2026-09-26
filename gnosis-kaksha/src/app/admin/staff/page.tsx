'use client';

import { useState } from 'react';
import { UserPlus, Shield, Calculator, BookOpen, GraduationCap, KeyRound, ChevronDown, Users, Library } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { apiFetch, useApi } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';
import { SUBJECT_FEES } from '@/lib/fees';
import type { TeachingAssignment } from '@/lib/institute-data';
import type { Permission, UserRole } from '@/lib/permissions';

interface Account {
  id: string;
  role: UserRole;
  fullName: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  registrationNumber: string | null;
  permissions: Permission[];
  assignments: TeachingAssignment[] | null;
}

const CLASS_NUMBERS = Object.keys(SUBJECT_FEES).map(Number).sort((a, b) => a - b);
const slotKey = (a: TeachingAssignment) => `${a.classNumber}:${a.subject}`;

const ROLE_ICON: Record<UserRole, React.ReactNode> = {
  admin: <Shield size={18} className="text-[#2E5EAA]" />,
  accountant: <Calculator size={18} className="text-[#10B981]" />,
  teacher: <BookOpen size={18} className="text-[#F59E0B]" />,
  student: <GraduationCap size={18} className="text-[#1295D8]" />,
};

const ROLE_TONE: Record<UserRole, 'blue' | 'green' | 'amber' | 'gray'> = {
  admin: 'blue',
  accountant: 'green',
  teacher: 'amber',
  student: 'gray',
};

const ROLE_FILTERS: Array<{ value: 'all' | UserRole; label: string }> = [
  { value: 'all', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'accountant', label: 'Accountants' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'student', label: 'Students' },
];

const humanize = (p: string) => p.replace(/_/g, ' ');
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function AdminAccountsPage() {
  const { data, error, loading, reload } = useApi<{ accounts: Account[] }>('/api/admin/accounts');
  const [form, setForm] = useState({ fullName: '', email: '', role: 'teacher' as 'teacher' | 'accountant', password: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [resetTarget, setResetTarget] = useState<Account | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [subjectsTarget, setSubjectsTarget] = useState<Account | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [savingSubjects, setSavingSubjects] = useState(false);

  const openSubjects = (a: Account) => {
    setSubjectsTarget(a);
    setSelectedSlots(new Set((a.assignments ?? []).map(slotKey)));
  };

  const toggleSlot = (key: string) =>
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const saveSubjects = async () => {
    if (!subjectsTarget) return;
    setSavingSubjects(true);
    try {
      const assignments = [...selectedSlots].map((k) => {
        const [cls, ...rest] = k.split(':');
        return { classNumber: Number(cls), subject: rest.join(':') };
      });
      await apiFetch('/api/admin/assignments', { method: 'PUT', json: { teacherId: subjectsTarget.id, assignments } });
      toast.success(`Subjects saved for ${subjectsTarget.fullName || subjectsTarget.email}.`);
      setSubjectsTarget(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save subjects.');
    } finally {
      setSavingSubjects(false);
    }
  };

  const accounts = data?.accounts ?? [];
  const visible = roleFilter === 'all' ? accounts : accounts.filter((a) => a.role === roleFilter);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await apiFetch('/api/admin/accounts', { method: 'POST', json: form });
      toast.success(`${capitalize(form.role)} account created for ${form.fullName}.`);
      setForm({ fullName: '', email: '', role: 'teacher', password: '' });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setIsCreating(false);
    }
  };

  const update = async (account: Account, patch: { role?: UserRole; isActive?: boolean; password?: string }, success: string) => {
    setBusyId(account.id);
    try {
      await apiFetch('/api/admin/accounts', { method: 'PATCH', json: { id: account.id, ...patch } });
      toast.success(success);
      reload();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    const ok = await update(resetTarget, { password: newPassword }, `Password reset for ${resetTarget.fullName || resetTarget.email}.`);
    if (ok) {
      setResetTarget(null);
      setNewPassword('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Accounts &amp; Permissions</h1>
        <p className="mt-1 text-[#4A5568]">
          Every account, its role, and exactly what that role can do. Create teacher and accountant
          accounts here; students get their account through the admission form.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SectionCard title="Create Staff Account" description="Teacher or accountant">
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="e.g. Priya Sharma"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                required
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="e.g. priya@gnosiskaksha.cloud"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
              <Select
                label="Role"
                options={[
                  { value: 'teacher', label: 'Teacher' },
                  { value: 'accountant', label: 'Accountant' },
                ]}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof form.role }))}
              />
              <Input
                label="Temporary Password"
                type="password"
                placeholder="At least 8 characters"
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
              <Button type="submit" variant="primary" className="w-full" isLoading={isCreating}>
                <UserPlus size={16} />
                Create Account
              </Button>
            </form>
          </SectionCard>
        </div>

        <div className="lg:col-span-2">
          <SectionCard
            title="All Accounts"
            description={data ? `${accounts.length} account${accounts.length === 1 ? '' : 's'}` : undefined}
            action={
              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-[#1A2B4A] focus:border-[#1295D8] focus:outline-none"
              >
                {ROLE_FILTERS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            }
            bodyClassName="p-0"
          >
            {loading && !data ? (
              <LoadingState label="Loading accounts…" />
            ) : error ? (
              <div className="p-6"><ErrorState message={error.message} onRetry={reload} /></div>
            ) : visible.length === 0 ? (
              <div className="p-6"><EmptyState icon={Users} title="No accounts" message="No accounts match this filter." /></div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {visible.map((a) => {
                  const isAdmin = a.role === 'admin';
                  const busy = busyId === a.id;
                  return (
                    <li key={a.id} className={`px-4 py-4 sm:px-6 ${a.isActive ? '' : 'bg-gray-50'}`}>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7]">
                          {ROLE_ICON[a.role]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[#1A2B4A]">
                            {a.fullName || a.email}
                            {!a.isActive && <span className="ml-2 text-xs font-medium text-red-600">Deactivated</span>}
                          </p>
                          <p className="truncate text-xs text-[#718096]">
                            {a.email}
                            {a.registrationNumber && <> · <span className="font-mono">{a.registrationNumber}</span></>}
                            {' · '}
                            {a.lastSignInAt ? `Last sign-in ${formatDate(a.lastSignInAt.slice(0, 10))}` : 'Never signed in'}
                          </p>
                        </div>
                        {isAdmin ? (
                          <Badge tone={ROLE_TONE[a.role]}>Master Admin</Badge>
                        ) : (
                          <select
                            aria-label={`Role for ${a.fullName || a.email}`}
                            value={a.role}
                            disabled={busy || !!a.registrationNumber}
                            title={a.registrationNumber ? 'Linked to a student record' : undefined}
                            onChange={(e) =>
                              update(a, { role: e.target.value as UserRole }, `${a.fullName || a.email} is now ${e.target.value}.`)
                            }
                            className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-[#1A2B4A] focus:border-[#1295D8] focus:outline-none disabled:opacity-60"
                          >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="accountant">Accountant</option>
                          </select>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 pl-0 sm:pl-14">
                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                          aria-expanded={expanded === a.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1295D8] hover:underline"
                        >
                          {a.permissions.length} permissions
                          <ChevronDown size={14} className={`transition ${expanded === a.id ? 'rotate-180' : ''}`} />
                        </button>
                        {!isAdmin && (
                          <>
                            <span className="text-gray-300">|</span>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => { setResetTarget(a); setNewPassword(''); }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#4A5568] hover:text-[#1A2B4A] disabled:opacity-50"
                            >
                              <KeyRound size={13} /> Reset password
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                update(
                                  a,
                                  { isActive: !a.isActive },
                                  a.isActive ? `${a.fullName || a.email} deactivated.` : `${a.fullName || a.email} reactivated.`
                                )
                              }
                              className={`text-xs font-semibold disabled:opacity-50 ${a.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-700 hover:text-green-800'}`}
                            >
                              {a.isActive ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </>
                        )}
                      </div>

                      {a.role === 'teacher' && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:pl-14">
                          {(a.assignments ?? []).length === 0 ? (
                            <span className="text-xs font-medium text-amber-700">No subjects assigned — this teacher sees no classes yet.</span>
                          ) : (
                            (a.assignments ?? []).map((s) => (
                              <span key={slotKey(s)} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                                {s.subject} · Class {s.classNumber}
                              </span>
                            ))
                          )}
                          <button
                            type="button"
                            onClick={() => openSubjects(a)}
                            disabled={!a.isActive}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1295D8] hover:underline disabled:opacity-50"
                          >
                            <Library size={13} /> Edit subjects
                          </button>
                        </div>
                      )}

                      {expanded === a.id && (
                        <div className="mt-3 flex flex-wrap gap-1.5 sm:pl-14">
                          {a.permissions.map((p) => (
                            <span key={p} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                              {humanize(p)}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <Modal
        isOpen={!!subjectsTarget}
        onClose={() => setSubjectsTarget(null)}
        title={`Subjects taught by ${subjectsTarget?.fullName || subjectsTarget?.email || ''}`}
        size="xl"
      >
        <p className="mb-4 text-sm text-[#4A5568]">
          Tick each subject this teacher teaches, per class. They will only see those students, and can only take
          attendance, upload material and request allocations for them. Students see their name on My Courses.
        </p>
        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {CLASS_NUMBERS.map((cls) => (
            <fieldset key={cls} className="rounded-lg border border-gray-200 p-3">
              <legend className="px-1 text-sm font-semibold text-[#1A2B4A]">Class {cls}</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.keys(SUBJECT_FEES[cls]).map((subject) => {
                  const key = `${cls}:${subject}`;
                  return (
                    <label key={key} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[#1A2B4A] hover:bg-[#F0F7FD]">
                      <input
                        type="checkbox"
                        checked={selectedSlots.has(key)}
                        onChange={() => toggleSlot(key)}
                        className="h-4 w-4 rounded border-gray-300 text-[#1295D8] focus:ring-[#1295D8]"
                      />
                      {subject}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-[#718096]">{selectedSlots.size} selected</span>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setSubjectsTarget(null)}>Cancel</Button>
            <Button type="button" variant="primary" isLoading={savingSubjects} onClick={saveSubjects}>Save subjects</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset password"
        size="sm"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-[#4A5568]">
            Set a new password for <strong>{resetTarget?.fullName || resetTarget?.email}</strong> and share it
            with them privately.
          </p>
          <Input
            label="New password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1" isLoading={busyId === resetTarget?.id}>
              Reset
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
