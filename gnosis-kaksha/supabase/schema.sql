-- Gnosis Kaksha — database schema
-- Run this once in the Supabase dashboard → SQL Editor.
--
-- A single status-driven `students` table is the source of truth for the whole
-- institute. A row starts life as `pending` (created by the public admission
-- form), becomes `active` when an admin approves it, or `rejected` otherwise.
-- The Admin and Accountant portals derive every number from this one table via
-- lib/institute-data.ts, so the two portals never disagree.
--
-- Access model: this table is written and read ONLY by the server using the
-- service-role key (see src/lib/supabase/admin.ts). RLS is enabled with no
-- anon/authenticated policies, so the browser can never touch it directly.

-- Registration numbers: GK-<year>-<4-digit seq>. Starts at 200 so it never
-- collides with the seeded sample students (GK-2026-0122 … 0176).
create sequence if not exists public.student_reg_seq start 200;

create table if not exists public.students (
  id                  uuid primary key default gen_random_uuid(),
  registration_number text unique not null
    default ('GK-' || to_char(now(), 'YYYY') || '-' ||
             lpad(nextval('public.student_reg_seq')::text, 4, '0')),
  full_name           text not null,
  class_number        int  not null,
  stream              text,
  board               text not null default 'SEBA',
  subjects            text[] not null default '{}',
  parent_name         text,
  parent_phone        text,
  mobile              text,
  email               text,
  previous_percentage numeric not null default 0,
  dob                 date,
  school_name         text,
  address             text,
  city                text,
  state               text,
  pincode             text,
  document_type       text,
  tshirt_size         text,
  paid_this_month     boolean not null default false,
  status              text not null default 'pending'
                        check (status in ('pending', 'active', 'rejected')),
  admission_date      date not null default current_date,
  created_at          timestamptz not null default now()
);

create index if not exists students_status_idx on public.students (status);

-- Lock the table down: only the service-role key (used server-side) may read
-- or write. No anon/authenticated policies are defined, so PostgREST denies the
-- browser by default.
alter table public.students enable row level security;
