'use client';

import { useState } from 'react';
import { Building2, Plus, Pencil, Check, X, MapPin, LocateFixed } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { Badge } from '@/components/dashboard/Badge';
import { EmptyState } from '@/components/dashboard/EmptyState';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiFetch, useApi } from '@/hooks/useApi';
import type { Branch } from '@/lib/institute-data';

interface BranchRow extends Branch {
  studentCount: number;
  teacherCount: number;
}

export default function AdminBranchesPage() {
  const { data, error, loading, reload } = useApi<{ branches: BranchRow[] }>('/api/admin/branches');
  const [form, setForm] = useState({ name: '', address: '' });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; address: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [locating, setLocating] = useState<{ id: string; lat: string; lng: string; radius: string } | null>(null);

  const useHere = () => {
    if (!navigator.geolocation) return toast.error('This device cannot share its location.');
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocating((l) => l && { ...l, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }),
      () => toast.error('Could not get your location. Allow location access and try again.'),
      { enableHighAccuracy: true, timeout: 20_000 }
    );
  };

  const branches = data?.branches ?? [];

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await apiFetch('/api/admin/branches', { method: 'POST', json: form });
      toast.success(`Branch "${form.name.trim()}" added.`);
      setForm({ name: '', address: '' });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the branch.');
    } finally {
      setAdding(false);
    }
  };

  const update = async (id: string, patch: Record<string, unknown>, success: string) => {
    setBusyId(id);
    try {
      await apiFetch('/api/admin/branches', { method: 'PATCH', json: { id, ...patch } });
      toast.success(success);
      setEditing(null);
      reload();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the branch.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">Branches</h1>
        <p className="mt-1 text-[#4A5568]">
          Every student and teacher belongs to one branch. Applicants choose their branch on the admission form;
          you set a teacher&apos;s branch in Accounts &amp; Permissions. Branch names must be unique.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title="Add a branch" className="lg:col-span-1">
          <form onSubmit={add} className="space-y-4">
            <Input
              label="Branch name"
              placeholder="e.g. Silchar"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              minLength={2}
              maxLength={80}
              required
            />
            <Input
              label="Address (optional)"
              placeholder="e.g. Club Road, Silchar"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              maxLength={300}
            />
            <Button type="submit" variant="primary" className="w-full" isLoading={adding}>
              <Plus size={16} /> Add branch
            </Button>
          </form>
        </SectionCard>

        <SectionCard
          title="All branches"
          description={data ? `${branches.length} branch${branches.length === 1 ? '' : 'es'}` : undefined}
          className="lg:col-span-2"
          bodyClassName="p-0"
        >
          {loading && !data ? (
            <LoadingState label="Loading branches…" />
          ) : error && !data ? (
            <div className="p-6"><ErrorState message={error.message} onRetry={reload} /></div>
          ) : branches.length === 0 ? (
            <div className="p-6"><EmptyState icon={Building2} title="No branches yet" message="Add your first branch on the left." /></div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {branches.map((b) => {
                const isEditing = editing?.id === b.id;
                const busy = busyId === b.id;
                return (
                  <li key={b.id} className={`px-4 py-4 sm:px-6 ${b.isActive ? '' : 'bg-gray-50'}`}>
                    {isEditing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          update(b.id, { name: editing.name, address: editing.address }, 'Branch updated.');
                        }}
                        className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                      >
                        <Input
                          label="Name"
                          value={editing.name}
                          onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                          minLength={2}
                          maxLength={80}
                          required
                        />
                        <Input
                          label="Address"
                          value={editing.address}
                          onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                          maxLength={300}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" variant="primary" size="sm" isLoading={busy} aria-label="Save">
                            <Check size={16} />
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)} aria-label="Cancel">
                            <X size={16} />
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#CDE6F7] text-[#1295D8]">
                          <Building2 size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#1A2B4A]">
                            {b.name}
                            {!b.isActive && <span className="ml-2 text-xs font-medium text-red-600">Inactive</span>}
                          </p>
                          <p className="text-xs text-[#718096]">
                            {b.address || 'No address'} · {b.studentCount} student{b.studentCount === 1 ? '' : 's'} ·{' '}
                            {b.teacherCount} teacher{b.teacherCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <Badge tone={b.isActive ? 'green' : 'gray'}>{b.isActive ? 'Open for admissions' : 'Closed'}</Badge>
                        <div className="flex w-full gap-3 sm:w-auto">
                          <button
                            type="button"
                            onClick={() => setLocating({ id: b.id, lat: b.latitude?.toString() ?? '', lng: b.longitude?.toString() ?? '', radius: String(b.radiusM ?? 200) })}
                            disabled={busy}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1295D8] hover:underline disabled:opacity-50"
                            title="Location used for staff GPS attendance"
                          >
                            <MapPin size={13} /> {b.latitude != null ? 'Location set' : 'Set location'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing({ id: b.id, name: b.name, address: b.address ?? '' })}
                            disabled={busy}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1295D8] hover:underline disabled:opacity-50"
                          >
                            <Pencil size={13} /> Rename
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (b.isActive && !window.confirm(`Close "${b.name}" to new admissions? Existing students and teachers stay in it.`)) return;
                              update(b.id, { isActive: !b.isActive }, b.isActive ? `"${b.name}" closed to new admissions.` : `"${b.name}" reopened.`);
                            }}
                            className={`text-xs font-semibold disabled:opacity-50 ${b.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-700 hover:text-green-800'}`}
                          >
                            {b.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </div>
                      </div>
                    )}
                    {locating?.id === b.id && (
                      <form
                        className="mt-3 space-y-2 rounded-lg border border-blue-100 bg-blue-50/50 p-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const lat = Number(locating.lat), lng = Number(locating.lng), radius = Number(locating.radius);
                          if (!locating.lat || !locating.lng || Number.isNaN(lat) || Number.isNaN(lng)) return toast.error('Enter the latitude and longitude, or use your current location.');
                          update(b.id, { latitude: lat, longitude: lng, radiusM: radius }, `Location of "${b.name}" saved.`).then((ok) => ok && setLocating(null));
                        }}
                      >
                        <p className="text-xs text-[#4A5568]">Teachers can mark their own attendance only within this distance of the branch. Stand at the branch and use your current location, or paste the coordinates from Google Maps.</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <Input label="Latitude" value={locating.lat} onChange={(e) => setLocating({ ...locating, lat: e.target.value })} placeholder="24.8692" />
                          <Input label="Longitude" value={locating.lng} onChange={(e) => setLocating({ ...locating, lng: e.target.value })} placeholder="92.3554" />
                          <Input label="Allowed radius (m)" type="number" min={20} max={5000} value={locating.radius} onChange={(e) => setLocating({ ...locating, radius: e.target.value })} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={useHere} className="inline-flex items-center gap-1"><LocateFixed size={14} /> Use my current location</Button>
                          <Button type="submit" size="sm" isLoading={busy}>Save location</Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setLocating(null)}>Cancel</Button>
                        </div>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
