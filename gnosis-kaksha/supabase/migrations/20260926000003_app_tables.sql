-- =============================================================================
-- Tables for features that previously lived only in the browser's
-- localStorage or in server memory (lost on restart). Idempotent.
-- =============================================================================

-- Notices: attachment metadata (the file itself is a data: URL or a link in
-- external_url, capped in the API at 5 MB).
alter table public.notices
  add column if not exists attachment_name text,
  add column if not exists attachment_size text;

-- Attendance: one record per class + subject + day, entries as JSON.
create table if not exists public.attendance_records (
  id              uuid primary key default gen_random_uuid(),
  date            date not null,
  class_number    int  not null,
  subject         text not null,
  teacher_id      uuid references auth.users(id) on delete set null,
  teacher_name    text not null,
  mode            text not null default 'manual' check (mode in ('manual', 'biometric')),
  entries         jsonb not null default '[]'::jsonb,
  total_students  int not null default 0,
  present_count   int not null default 0,
  absent_count    int not null default 0,
  late_count      int not null default 0,
  saved_at        timestamptz not null default now()
);
create unique index if not exists attendance_records_slot_uniq
  on public.attendance_records (date, class_number, lower(subject));
alter table public.attendance_records enable row level security;
revoke all on public.attendance_records from anon, authenticated;

-- Study materials: files are stored in the database (bytea, <= 10 MB each) so
-- they are covered by the nightly pg_dump without extra storage services.
create table if not exists public.study_materials (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text not null default '',
  class_number  int  not null,
  subject       text not null,
  category      text not null
                  check (category in ('Notes', 'PYQ', 'Worksheet', 'Formula Sheet', 'Syllabus')),
  file_name     text,
  file_type     text,
  file_size     text,
  file_data     bytea,
  uploaded_by   text not null,
  uploader_id   uuid references auth.users(id) on delete set null,
  downloads     int not null default 0,
  is_featured   boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists study_materials_class_idx on public.study_materials (class_number);
alter table public.study_materials enable row level security;
revoke all on public.study_materials from anon, authenticated;

create or replace function public.increment_material_downloads(p_id uuid)
returns int language sql security definer set search_path = public as $$
  update public.study_materials set downloads = downloads + 1 where id = p_id returning downloads;
$$;
revoke all on function public.increment_material_downloads(uuid) from public, anon, authenticated;
grant execute on function public.increment_material_downloads(uuid) to service_role;

-- Allocation requests: track who requested/resolved by account id.
alter table public.allocation_requests
  add column if not exists requested_by_id uuid references auth.users(id) on delete set null,
  add column if not exists resolved_by     text;

-- PostgREST / service role access to new objects.
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
