-- =============================================================================
-- Institute-wide settings editable by the admin (e.g. the UPI payee used in
-- every payment QR code). One row per key. Idempotent.
-- =============================================================================

create table if not exists public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant all on public.app_settings to service_role;
