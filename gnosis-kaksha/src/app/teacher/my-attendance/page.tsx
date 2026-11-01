'use client';

import { useState } from 'react';
import { CalendarCheck, Clock, LogIn, LogOut, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/dashboard/Badge';
import { LoadingState, ErrorState } from '@/components/dashboard/PageState';
import { Button } from '@/components/ui/Button';
import { useApi, apiFetch } from '@/hooks/useApi';
import { formatDate } from '@/lib/format';

interface Rec {
  id: string;
  date: string;
  checkInAt: string;
  checkInDistance: number | null;
  checkOutAt: string | null;
  checkOutDistance: number | null;
}
interface Data {
  month: string;
  today: string;
  records: Rec[];
  branch: { name: string; located: boolean; radius: number } | null;
}

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '—');

function locate(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('This device cannot share its location.'));
    navigator.geolocation.getCurrentPosition(resolve, (e) =>
      reject(new Error(e.code === e.PERMISSION_DENIED ? 'Location permission was denied. Allow location for this site and try again.' : 'Could not get your location. Try again outdoors or turn on precise location.')),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 });
  });
}

export default function MyAttendancePage() {
  const [month, setMonth] = useState(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).format(new Date()));
  const { data, error, loading, reload } = useApi<Data>(`/api/staff-attendance?month=${month}`);
  const [busy, setBusy] = useState<'in' | 'out' | null>(null);

  if (loading && !data) return <LoadingState label="Loading attendance…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Could not load attendance.'} onRetry={reload} />;

  const today = data.records.find((r) => r.date === data.today);
  const mark = async (action: 'in' | 'out') => {
    setBusy(action);
    try {
      const pos = await locate();
      await apiFetch('/api/staff-attendance', {
        method: 'POST',
        json: { action, latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy },
      });
      toast.success(action === 'in' ? 'Checked in. Have a great day!' : 'Checked out.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not mark attendance', { duration: 6000 });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A2B4A]">My Attendance</h1>
        <p className="mt-1 text-[#4A5568]">
          Check in when you arrive and check out when you leave. Your phone&apos;s location must be within{' '}
          {data.branch ? `${data.branch.radius} m of ${data.branch.name}` : 'the branch radius'}.
        </p>
      </div>

      <SectionCard title={`Today — ${formatDate(data.today)}`}>
        {!data.branch?.located ? (
          <p className="text-sm text-amber-700">The location of your branch has not been set yet. Ask the admin to set it under Branches.</p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm">
              <p className="flex items-center gap-2"><LogIn size={15} className="text-emerald-600" /> Check-in: <strong>{time(today?.checkInAt ?? null)}</strong>{today?.checkInDistance != null && <span className="text-xs text-gray-500">({today.checkInDistance} m away)</span>}</p>
              <p className="flex items-center gap-2"><LogOut size={15} className="text-red-500" /> Check-out: <strong>{time(today?.checkOutAt ?? null)}</strong></p>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => mark('in')} disabled={!!today} isLoading={busy === 'in'} className="inline-flex items-center gap-1.5">
                <MapPin size={16} /> Check in
              </Button>
              <Button type="button" variant="outline" onClick={() => mark('out')} disabled={!today || !!today.checkOutAt} isLoading={busy === 'out'} className="inline-flex items-center gap-1.5">
                <LogOut size={16} /> Check out
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={CalendarCheck} label="Days present this month" value={data.records.length} />
        <StatCard icon={Clock} label="Days without check-out" value={data.records.filter((r) => !r.checkOutAt && r.date !== data.today).length} />
      </div>

      <SectionCard
        title="Monthly record"
        action={<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border-2 border-gray-300 px-2 py-1 text-sm" aria-label="Month" />}
        bodyClassName="p-0"
      >
        {data.records.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No check-ins this month.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-[#718096]">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Check-in</th>
                <th className="px-5 py-3">Check-out</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.records.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-2.5 font-medium">{formatDate(r.date)}</td>
                  <td className="px-5 py-2.5">{time(r.checkInAt)}</td>
                  <td className="px-5 py-2.5">{time(r.checkOutAt)}</td>
                  <td className="px-5 py-2.5"><Badge tone="green">Present</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}
