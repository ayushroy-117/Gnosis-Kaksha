'use client';

import { useState } from 'react';
import {
  Award, BookOpen, Briefcase, Calendar, Droplet, Flag, Heart, Home, Info, KeyRound, Languages, LogOut, Mail, MapPin,
  Pencil, Phone, Plus, ShieldCheck, Sparkles, Trash2, User, Users, Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { apiFetch } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';
import type { Certification, StaffProfile } from '@/lib/server/staff';
import type { TeachingAssignment } from '@/lib/institute-data';

type FieldKey = keyof StaffProfile;
interface Field {
  key: FieldKey;
  label: string;
  type?: 'text' | 'date' | 'textarea' | 'tags' | 'email' | 'select';
  options?: string[];
}

const show = (v: string | null | undefined) => v || <span className="font-normal text-gray-400">Not added</span>;

function Rows({ rows }: { rows: Array<{ icon: React.ReactNode; label: string; value: React.ReactNode }> }) {
  return (
    <dl className="divide-y divide-gray-100">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[1.2rem_9rem_1fr] items-start gap-2 py-2 text-sm">
          <span className="mt-0.5 text-[#1295D8]">{r.icon}</span>
          <dt className="text-[#718096]">{r.label}</dt>
          <dd className="font-medium text-[#1A2B4A]">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function EditButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant="secondary" onClick={onClick} className="inline-flex items-center gap-1 text-xs">
      <Pencil size={13} /> Edit
    </Button>
  );
}

/** Dialog that edits a few self-service fields and PATCHes /api/staff/me. */
function EditDialog({
  title, fields, profile, onClose, onSaved,
}: { title: string; fields: Field[]; profile: StaffProfile; onClose: () => void; onSaved: (p: StaffProfile) => void }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => {
      const v = profile[f.key];
      return [f.key, Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v)];
    }))
  );
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      const json = Object.fromEntries(fields.map((f) => [
        f.key,
        f.type === 'tags' ? values[f.key].split(',').map((t) => t.trim()).filter(Boolean) : values[f.key].trim(),
      ]));
      const { profile: updated } = await apiFetch<{ profile: StaffProfile }>('/api/staff/me', { method: 'PATCH', json });
      toast.success('Profile updated');
      onSaved(updated);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title={title} size="lg">
      <div className="space-y-3">
        {fields.map((f) => {
          const set = (v: string) => setValues((prev) => ({ ...prev, [f.key]: v }));
          if (f.type === 'textarea') {
            return (
              <label key={f.key} className="block text-sm font-medium text-[#1A2B4A]">
                {f.label}
                <textarea rows={4} value={values[f.key]} onChange={(e) => set(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-gray-300 p-2 text-sm focus:border-[#1295D8] focus:outline-none" />
              </label>
            );
          }
          if (f.type === 'select') {
            return (
              <label key={f.key} className="block text-sm font-medium text-[#1A2B4A]">
                {f.label}
                <select value={values[f.key]} onChange={(e) => set(e.target.value)} className="mt-1 w-full rounded-lg border-2 border-gray-300 px-2 py-2 text-sm">
                  <option value="">—</option>
                  {f.options?.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
            );
          }
          return (
            <Input
              key={f.key}
              label={f.type === 'tags' ? `${f.label} (comma separated)` : f.label}
              type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'}
              value={values[f.key]}
              onChange={(e) => set(e.target.value)}
            />
          );
        })}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={save} isLoading={saving}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

const ADMIN_NOTE = 'Name, phone, present address, father\'s name, department and joining date are printed on your ID card, so the office updates them.';

export function PersonalTab({ p, onSaved }: { p: StaffProfile; onSaved: (p: StaffProfile) => void }) {
  const [edit, setEdit] = useState<null | { title: string; fields: Field[] }>(null);
  const personal: Field[] = [
    { key: 'dob', label: 'Date of birth', type: 'date' },
    { key: 'gender', label: 'Gender', type: 'select', options: ['Female', 'Male', 'Other'] },
    { key: 'bloodGroup', label: 'Blood group', type: 'select', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    { key: 'alternateEmail', label: 'Alternate email', type: 'email' },
    { key: 'emergencyContact', label: 'Emergency contact (number and relation)' },
    { key: 'quote', label: 'Your teaching quote (shown on your profile)' },
  ];
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="personal-info">
      <SectionCard title="Personal Details" action={<EditButton onClick={() => setEdit({ title: 'Edit personal details', fields: personal })} />}>
        <Rows rows={[
          { icon: <User size={15} />, label: 'Full Name', value: p.fullName },
          { icon: <Calendar size={15} />, label: 'Date of Birth', value: show(p.dob && formatDate(p.dob)) },
          { icon: <Users size={15} />, label: 'Gender', value: show(p.gender) },
          { icon: <Droplet size={15} />, label: 'Blood Group', value: show(p.bloodGroup) },
          { icon: <Phone size={15} />, label: 'Phone Number', value: show(p.phone && `+91 ${p.phone}`) },
          { icon: <Mail size={15} />, label: 'Email Address', value: show(p.email) },
          { icon: <Mail size={15} />, label: 'Alternate Email', value: show(p.alternateEmail) },
          { icon: <Phone size={15} />, label: 'Emergency Contact', value: show(p.emergencyContact) },
          { icon: <Users size={15} />, label: "Father's Name", value: show(p.fatherName) },
        ]} />
      </SectionCard>
      <div className="space-y-6">
        <SectionCard title="Address Information" action={<EditButton onClick={() => setEdit({ title: 'Edit permanent address', fields: [{ key: 'permanentAddress', label: 'Permanent address', type: 'textarea' }] })} />}>
          <Rows rows={[
            { icon: <Home size={15} />, label: 'Present Address', value: show(p.address) },
            { icon: <Home size={15} />, label: 'Permanent Address', value: show(p.permanentAddress) },
          ]} />
        </SectionCard>
        <SectionCard
          title="Other Information"
          action={<EditButton onClick={() => setEdit({ title: 'Edit other information', fields: [
            { key: 'nationality', label: 'Nationality' },
            { key: 'maritalStatus', label: 'Marital status', type: 'select', options: ['Unmarried', 'Married'] },
            { key: 'languages', label: 'Languages known' },
            { key: 'hobbies', label: 'Hobbies' },
          ] })} />}
        >
          <Rows rows={[
            { icon: <Flag size={15} />, label: 'Nationality', value: show(p.nationality) },
            { icon: <ShieldCheck size={15} />, label: 'Marital Status', value: show(p.maritalStatus) },
            { icon: <Languages size={15} />, label: 'Languages Known', value: show(p.languages) },
            { icon: <Heart size={15} />, label: 'Hobbies', value: show(p.hobbies) },
          ]} />
        </SectionCard>
        <p className="flex items-start gap-2 text-xs text-[#718096]"><Info size={14} className="mt-0.5 shrink-0" /> {ADMIN_NOTE}</p>
      </div>
      {edit && <EditDialog title={edit.title} fields={edit.fields} profile={p} onClose={() => setEdit(null)} onSaved={onSaved} />}
    </div>
  );
}

function Tags({ items, tone }: { items: string[]; tone: 'blue' | 'green' }) {
  if (!items.length) return <span className="text-sm text-gray-400">Not added</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => <Badge key={t} tone={tone}>{t}</Badge>)}
    </div>
  );
}

function CertificationsDialog({ p, onClose, onSaved }: { p: StaffProfile; onClose: () => void; onSaved: (p: StaffProfile) => void }) {
  const [list, setList] = useState<Certification[]>(p.certifications.length ? p.certifications : [{ title: '', issuer: '', year: '' }]);
  const [saving, setSaving] = useState(false);
  const set = (i: number, patch: Partial<Certification>) => setList(list.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const save = async () => {
    setSaving(true);
    try {
      const { profile } = await apiFetch<{ profile: StaffProfile }>('/api/staff/me', {
        method: 'PATCH',
        json: { certifications: list.filter((c) => c.title.trim()) },
      });
      toast.success('Certifications saved');
      onSaved(profile);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal isOpen onClose={onClose} title="Certifications & qualifications" size="xl">
      <div className="space-y-3">
        {list.map((c, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_5rem_2rem] gap-2">
            <input value={c.title} onChange={(e) => set(i, { title: e.target.value })} placeholder="e.g. B.Sc. (Hons) in Physics" aria-label="Certificate" className="rounded-lg border-2 border-gray-300 px-2 py-1.5 text-sm" />
            <input value={c.issuer} onChange={(e) => set(i, { issuer: e.target.value })} placeholder="University / issuer" aria-label="Issuer" className="rounded-lg border-2 border-gray-300 px-2 py-1.5 text-sm" />
            <input value={c.year} onChange={(e) => set(i, { year: e.target.value })} placeholder="Year" aria-label="Year" className="rounded-lg border-2 border-gray-300 px-2 py-1.5 text-sm" />
            <button type="button" onClick={() => setList(list.filter((_, j) => j !== i))} className="rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove">
              <Trash2 size={15} className="mx-auto" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setList([...list, { title: '', issuer: '', year: '' }])} className="inline-flex items-center gap-1 text-xs font-semibold text-[#1295D8] hover:underline">
          <Plus size={13} /> Add certificate
        </button>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={save} isLoading={saving}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

const STATUS_LABEL = { active: 'Active', resigned: 'Resigned', terminated: 'Terminated' } as const;

export function ProfessionalTab({ p, assignments, onSaved }: { p: StaffProfile; assignments: TeachingAssignment[] | null; onSaved: (p: StaffProfile) => void }) {
  const [edit, setEdit] = useState<null | { title: string; fields: Field[] }>(null);
  const [certs, setCerts] = useState(false);
  const subjects = [...new Set((assignments ?? []).map((a) => a.subject))];
  const classes = [...new Set((assignments ?? []).map((a) => a.classNumber))].sort((a, b) => a - b);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="professional-info">
      <SectionCard
        title="Employment & Academic Details"
        action={<EditButton onClick={() => setEdit({ title: 'Edit qualification & experience', fields: [
          { key: 'qualification', label: 'Qualification' },
          { key: 'experience', label: 'Teaching experience (e.g. 3+ years)' },
        ] })} />}
      >
        <Rows rows={[
          { icon: <Briefcase size={15} />, label: 'Designation', value: p.designation },
          { icon: <BookOpen size={15} />, label: 'Department', value: show(p.department) },
          { icon: <BookOpen size={15} />, label: 'Subject(s)', value: show(subjects.join(', ')) },
          { icon: <Award size={15} />, label: 'Qualification', value: show(p.qualification) },
          { icon: <Sparkles size={15} />, label: 'Teaching Experience', value: show(p.experience) },
          { icon: <Calendar size={15} />, label: 'Date of Joining', value: show(p.dateOfJoining && formatDate(p.dateOfJoining)) },
          { icon: <Briefcase size={15} />, label: 'Employment Type', value: show(p.employmentType) },
          { icon: <ShieldCheck size={15} />, label: 'Current Status', value: <Badge tone={p.employmentStatus === 'active' ? 'green' : 'red'}>{STATUS_LABEL[p.employmentStatus]}</Badge> },
          { icon: <ShieldCheck size={15} />, label: 'Probation Period', value: show(p.probation) },
          { icon: <MapPin size={15} />, label: 'Work Location', value: show(p.workLocation || p.branchName) },
        ]} />
      </SectionCard>
      <div className="space-y-6">
        <SectionCard title="Teaching Responsibilities">
          <Rows rows={[
            { icon: <BookOpen size={15} />, label: 'Classes Assigned', value: show(classes.map((c) => `Class ${c}`).join(', ')) },
            { icon: <BookOpen size={15} />, label: 'Subjects Handling', value: show(assignments?.map((a) => `${a.subject} (Class ${a.classNumber})`).join(', ')) },
            { icon: <MapPin size={15} />, label: 'Branch', value: show(p.branchName) },
            { icon: <Calendar size={15} />, label: 'Weekly Classes', value: show(p.weeklyClasses) },
            { icon: <Briefcase size={15} />, label: 'Additional Duties', value: show(p.additionalDuties) },
          ]} />
        </SectionCard>
        <SectionCard
          title="Skills & Expertise"
          action={<EditButton onClick={() => setEdit({ title: 'Edit skills', fields: [
            { key: 'teachingSkills', label: 'Teaching skills', type: 'tags' },
            { key: 'technicalSkills', label: 'Technical skills', type: 'tags' },
          ] })} />}
        >
          <div className="space-y-3">
            <div><p className="mb-1 text-xs font-semibold text-[#718096]">Teaching Skills</p><Tags items={p.teachingSkills} tone="blue" /></div>
            <div><p className="mb-1 text-xs font-semibold text-[#718096]">Technical Skills</p><Tags items={p.technicalSkills} tone="green" /></div>
          </div>
        </SectionCard>
      </div>
      <SectionCard title="About Me (Professional)" action={<EditButton onClick={() => setEdit({ title: 'About me', fields: [{ key: 'about', label: 'About me', type: 'textarea' }] })} />}>
        <p className="whitespace-pre-line text-sm text-[#4A5568]">{p.about || <span className="text-gray-400">Tell students and the office about your teaching approach.</span>}</p>
      </SectionCard>
      <SectionCard
        title="Certifications"
        action={<Button type="button" size="sm" variant="secondary" onClick={() => setCerts(true)} className="inline-flex items-center gap-1 text-xs"><Plus size={13} /> Add / Edit</Button>}
      >
        {p.certifications.length === 0 ? (
          <p className="text-sm text-gray-400">No certificates added yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {p.certifications.map((c, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-2 text-sm">
                <div className="flex items-start gap-2">
                  <Award size={16} className="mt-0.5 text-[#1295D8]" />
                  <div><p className="font-semibold text-[#1A2B4A]">{c.title}</p><p className="text-xs text-gray-500">{c.issuer}</p></div>
                </div>
                <span className="text-xs text-gray-500">{c.year}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      {edit && <EditDialog title={edit.title} fields={edit.fields} profile={p} onClose={() => setEdit(null)} onSaved={onSaved} />}
      {certs && <CertificationsDialog p={p} onClose={() => setCerts(false)} onSaved={onSaved} />}
    </div>
  );
}

export interface ActivityItem {
  action: string;
  detail: string | null;
  at: string;
}

export function SecurityTab({ p, activity }: { p: StaffProfile; activity: ActivityItem[] }) {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState<'pw' | 'out' | null>(null);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirmPw) return toast.error('The new passwords do not match.');
    setBusy('pw');
    try {
      await apiFetch('/api/account/password', { method: 'POST', json: { currentPassword: current, newPassword: next } });
      toast.success('Password changed');
      setCurrent(''); setNext(''); setConfirmPw('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change the password');
    } finally {
      setBusy(null);
    }
  };

  const signOutEverywhere = async () => {
    if (!confirm('Sign out of every device, including this one?')) return;
    setBusy('out');
    try {
      await apiFetch('/api/account/sessions', { method: 'DELETE' });
      router.push('/auth');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not sign out');
      setBusy(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <SectionCard title="Login Information" description="Manage your login credentials and account access.">
          <Rows rows={[
            { icon: <Mail size={15} />, label: 'Email Address', value: <span className="flex items-center gap-2">{p.email} <Badge tone="green">Verified</Badge></span> },
            { icon: <Phone size={15} />, label: 'Phone Number', value: show(p.phone && `+91 ${p.phone}`) },
            { icon: <ShieldCheck size={15} />, label: 'Staff ID', value: <span className="font-mono">{p.staffCode}</span> },
          ]} />
        </SectionCard>
        <SectionCard title="Change Password">
          <form onSubmit={changePassword} className="space-y-3">
            <Input label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
            <Input label="New password (min 8 characters)" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
            <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
            <Button type="submit" isLoading={busy === 'pw'} className="inline-flex items-center gap-1.5"><KeyRound size={15} /> Change password</Button>
          </form>
        </SectionCard>
      </div>
      <div className="space-y-6">
        <SectionCard title="Recent Activity">
          {activity.length === 0 ? (
            <p className="text-sm text-gray-400">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {activity.map((a, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Activity size={15} className="mt-0.5 text-[#1295D8]" />
                    <div><p className="font-medium text-[#1A2B4A]">{a.action}</p>{a.detail && <p className="text-xs text-gray-500">{a.detail}</p>}</div>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">{new Date(a.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Active Sessions" description="Lost a phone or used a shared computer? Sign out everywhere.">
          <Button type="button" variant="outline" onClick={signOutEverywhere} isLoading={busy === 'out'} className="inline-flex items-center gap-1.5">
            <LogOut size={15} /> Sign out of all devices
          </Button>
        </SectionCard>
      </div>
    </div>
  );
}
