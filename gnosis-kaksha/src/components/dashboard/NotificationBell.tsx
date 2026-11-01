'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useApi, apiFetch } from '@/hooks/useApi';

interface Note {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  at: string;
}

/** Bell with unread count; re-checks every minute while the portal is open. */
export function NotificationBell() {
  const { data, reload, setData } = useApi<{ unread: number; notifications: Note[] }>('/api/notifications');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(reload, 60_000);
    return () => clearInterval(t);
  }, [reload]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const markAllRead = async () => {
    setData((d) => (d ? { unread: 0, notifications: d.notifications.map((n) => ({ ...n, read: true })) } : d));
    await apiFetch('/api/notifications', { method: 'POST', json: {} }).catch(() => reload());
  };

  const unread = data?.unread ?? 0;
  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 text-[#4A5568] transition hover:bg-gray-100"
        aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <p className="text-sm font-bold text-[#1A2B4A]">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs font-semibold text-[#1295D8] hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
            {(data?.notifications ?? []).length === 0 && <li className="px-4 py-6 text-center text-sm text-gray-500">You&apos;re all caught up.</li>}
            {(data?.notifications ?? []).map((n) => {
              const inner = (
                <>
                  <p className={`text-sm ${n.read ? 'text-[#4A5568]' : 'font-semibold text-[#1A2B4A]'}`}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-gray-400">{new Date(n.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </>
              );
              const cls = `block px-4 py-2.5 ${n.read ? '' : 'bg-blue-50/50'} hover:bg-gray-50`;
              const read = () => {
                setOpen(false);
                if (!n.read) apiFetch('/api/notifications', { method: 'POST', json: { ids: [n.id] } }).then(reload, () => {});
              };
              return (
                <li key={n.id}>
                  {n.link ? <Link href={n.link} onClick={read} className={cls}>{inner}</Link> : <button type="button" onClick={read} className={`${cls} w-full text-left`}>{inner}</button>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
