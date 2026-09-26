-- =============================================================================
-- Branches of the institute. Every student and every teacher belongs to one
-- branch; branch names are unique (case-insensitive). Idempotent.
-- =============================================================================

create table if not exists public.branches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 2 and 80),
  address     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create unique index if not exists branches_name_uniq on public.branches (lower(btrim(name)));

alter table public.branches enable row level security;
revoke all on public.branches from anon, authenticated;
grant all on public.branches to service_role;

-- Existing data needs a home: one starting branch the admin can rename.
insert into public.branches (name)
select 'Main Branch'
where not exists (select 1 from public.branches);

-- Students: required branch
alter table public.students add column if not exists branch_id uuid references public.branches(id);
update public.students
  set branch_id = (select id from public.branches order by created_at limit 1)
  where branch_id is null;
alter table public.students alter column branch_id set not null;
create index if not exists students_branch_idx on public.students (branch_id);

-- Staff: teachers must have a branch (checked in the API); admin and
-- accountants may be null = all branches. Students' branch lives on students.
alter table public.profiles add column if not exists branch_id uuid references public.branches(id);
update public.profiles
  set branch_id = (select id from public.branches order by created_at limit 1)
  where branch_id is null and role = 'teacher';

-- Attendance is per branch: the same class/subject/day can exist at each branch.
alter table public.attendance_records add column if not exists branch_id uuid references public.branches(id);
update public.attendance_records
  set branch_id = (select id from public.branches order by created_at limit 1)
  where branch_id is null;
alter table public.attendance_records alter column branch_id set not null;
drop index if exists public.attendance_records_slot_uniq;
create unique index if not exists attendance_records_branch_slot_uniq
  on public.attendance_records (branch_id, date, class_number, lower(subject));
