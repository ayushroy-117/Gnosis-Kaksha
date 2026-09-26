-- =============================================================================
-- Which subject, for which class, each teacher teaches. Set by the admin.
-- Drives the teacher's scope (roster, attendance, study material, allocation
-- requests) and the teacher name students see on "My Courses". Idempotent.
-- =============================================================================

create table if not exists public.teacher_assignments (
  id            uuid primary key default gen_random_uuid(),
  teacher_id    uuid not null references public.profiles(id) on delete cascade,
  subject       text not null,
  class_number  int  not null check (class_number between 1 and 12),
  created_at    timestamptz not null default now(),
  unique (teacher_id, subject, class_number)
);

create index if not exists teacher_assignments_slot_idx
  on public.teacher_assignments (class_number, subject);

alter table public.teacher_assignments enable row level security;
revoke all on public.teacher_assignments from anon, authenticated;
grant all on public.teacher_assignments to service_role;
