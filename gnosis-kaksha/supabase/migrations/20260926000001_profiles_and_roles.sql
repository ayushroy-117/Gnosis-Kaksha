-- =============================================================================
-- Roles live in a server-owned table, never in user-editable auth metadata.
-- Idempotent: safe to re-run.
-- =============================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'student'
                check (role in ('student', 'teacher', 'accountant', 'admin')),
  full_name   text,
  email       text,
  student_id  uuid unique references public.students(id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- There is exactly one master admin. A second 'admin' row is rejected by the DB.
create unique index if not exists profiles_single_admin
  on public.profiles ((true)) where role = 'admin';

create index if not exists profiles_role_idx on public.profiles (role);

-- Only the server (service role) reads or writes profiles.
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;

-- Every new auth user gets a 'student' profile. Whatever role a client puts in
-- signup metadata is ignored; staff roles are assigned server-side only.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    'student',
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    lower(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Backfill users that existed before this migration. Staff keep their
-- non-admin staff role; everyone else becomes a student. Nobody is backfilled
-- as admin — the single admin is created by deploy/scripts/seed-admin.sh.
insert into public.profiles (id, role, full_name, email)
select
  u.id,
  coalesce((select s.role from public.staff s
            where s.user_id = u.id and s.role in ('teacher', 'accountant') limit 1), 'student'),
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1)),
  lower(u.email)
from auth.users u
on conflict (id) do nothing;

-- Lock sensitive tables to the service role. RLS is already on with no
-- policies; revoking privileges makes that explicit.
revoke all on public.students, public.transactions, public.staff,
              public.allocation_requests, public.contact_messages
  from anon, authenticated;
