-- =============================================================================
-- Teacher profile details, salary, GPS staff attendance, tests & results,
-- doubt support, teacher notices, leave, in-app notifications and an activity
-- log (for the staff reports on the admin/accountant portals). Idempotent.
-- Every table is server-only: RLS on, no anon/authenticated access.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Teacher profile: personal, professional and bank details
-- ---------------------------------------------------------------------------
alter table public.staff_details
  add column if not exists dob                date,
  add column if not exists gender             text,
  add column if not exists blood_group        text,
  add column if not exists alternate_email    text,
  add column if not exists emergency_contact  text,
  add column if not exists permanent_address  text,
  add column if not exists nationality        text,
  add column if not exists marital_status     text,
  add column if not exists languages          text,
  add column if not exists hobbies            text,
  add column if not exists quote              text,
  add column if not exists qualification      text,
  add column if not exists experience         text,
  add column if not exists employment_type    text,
  add column if not exists probation          text,
  add column if not exists work_location      text,
  add column if not exists about              text,
  add column if not exists teaching_skills    text[] not null default '{}',
  add column if not exists technical_skills   text[] not null default '{}',
  add column if not exists weekly_classes     text,
  add column if not exists additional_duties  text,
  add column if not exists certifications     jsonb  not null default '[]'::jsonb,  -- [{title, issuer, year}]
  add column if not exists monthly_salary     numeric(10,2),
  add column if not exists bank_holder        text,
  add column if not exists bank_name          text,
  add column if not exists bank_account       text,
  add column if not exists bank_ifsc          text,
  add column if not exists bank_account_type  text;

-- ---------------------------------------------------------------------------
-- Salary: one payment record per staff member per month, entered by the accountant
-- ---------------------------------------------------------------------------
create sequence if not exists public.salary_receipt_seq;

create table if not exists public.salary_payments (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  period           date not null check (extract(day from period) = 1),   -- first day of the pay month
  earnings         jsonb not null default '[]'::jsonb,                  -- [{label, amount}]
  deductions       jsonb not null default '[]'::jsonb,                  -- [{label, amount}]
  gross            numeric(10,2) not null default 0,
  total_deduction  numeric(10,2) not null default 0,
  net              numeric(10,2) not null default 0,
  status           text not null default 'pending' check (status in ('pending', 'paid')),
  payment_date     date,
  payment_mode     text,
  reference        text,
  receipt_number   text not null unique default
                     ('GK-SAL-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYY-MM') || '-'
                      || lpad(nextval('public.salary_receipt_seq')::text, 3, '0')),
  note             text,
  prepared_by      text,
  prepared_by_id   uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, period)
);
create index if not exists salary_payments_period_idx on public.salary_payments (period desc);

-- ---------------------------------------------------------------------------
-- Staff self-attendance by GPS: a branch has a location and an allowed radius
-- ---------------------------------------------------------------------------
alter table public.branches
  add column if not exists latitude   double precision,
  add column if not exists longitude  double precision,
  add column if not exists radius_m   int not null default 200 check (radius_m between 20 and 5000);

create table if not exists public.staff_attendance (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  date                  date not null,
  branch_id             uuid references public.branches(id),
  check_in_at           timestamptz not null default now(),
  check_in_distance_m   int,
  check_out_at          timestamptz,
  check_out_distance_m  int,
  method                text not null default 'gps' check (method in ('gps', 'manual')),
  note                  text,
  unique (user_id, date)
);
create index if not exists staff_attendance_date_idx on public.staff_attendance (date desc);

-- ---------------------------------------------------------------------------
-- Tests and marks (weekly / monthly), uploaded by the subject teacher
-- ---------------------------------------------------------------------------
create table if not exists public.tests (
  id               uuid primary key default gen_random_uuid(),
  branch_id        uuid not null references public.branches(id),
  class_number     int  not null check (class_number between 1 and 12),
  subject          text not null,
  test_type        text not null check (test_type in ('weekly', 'monthly', 'other')),
  title            text not null,
  test_date        date not null,
  max_marks        numeric(6,2) not null check (max_marks > 0),
  created_by       uuid references auth.users(id) on delete set null,
  created_by_name  text not null,
  created_at       timestamptz not null default now()
);
create index if not exists tests_slot_idx on public.tests (branch_id, class_number, test_date desc);

create table if not exists public.test_marks (
  test_id     uuid not null references public.tests(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  marks       numeric(6,2),
  absent      boolean not null default false,
  primary key (test_id, student_id)
);
create index if not exists test_marks_student_idx on public.test_marks (student_id);

-- ---------------------------------------------------------------------------
-- Doubt support: a student asks a subject teacher; the teacher posts a solution
-- to the whole class at a branch
-- ---------------------------------------------------------------------------
create table if not exists public.doubts (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students(id) on delete cascade,
  branch_id     uuid not null references public.branches(id),
  class_number  int  not null,
  subject       text not null,
  teacher_id    uuid references public.profiles(id) on delete set null,   -- the teacher it was sent to
  question      text not null,
  image         bytea,
  image_mime    text check (image_mime in ('image/jpeg', 'image/png', 'image/webp')),
  status        text not null default 'open' check (status in ('open', 'answered')),
  created_at    timestamptz not null default now(),
  answered_at   timestamptz
);
create index if not exists doubts_student_idx on public.doubts (student_id, created_at desc);
create index if not exists doubts_teacher_idx on public.doubts (teacher_id, status);

create table if not exists public.doubt_solutions (
  id            uuid primary key default gen_random_uuid(),
  doubt_id      uuid references public.doubts(id) on delete set null,
  teacher_id    uuid references public.profiles(id) on delete set null,
  teacher_name  text not null,
  branch_id     uuid not null references public.branches(id),
  class_number  int  not null,
  subject       text not null,
  title         text not null,
  note          text,
  link_url      text,                 -- for long videos (YouTube / Drive)
  file          bytea,                -- image / PDF / short video, <= 10 MB
  file_name     text,
  file_mime     text,
  file_size     text,
  created_at    timestamptz not null default now()
);
create index if not exists doubt_solutions_slot_idx on public.doubt_solutions (branch_id, class_number, created_at desc);

-- ---------------------------------------------------------------------------
-- Teacher notices: go only to students of that class at that branch, never to
-- the public home page (that shows admin notices only)
-- ---------------------------------------------------------------------------
alter table public.notices
  add column if not exists source          text not null default 'admin' check (source in ('admin', 'teacher')),
  add column if not exists class_number    int,
  add column if not exists branch_id       uuid references public.branches(id),
  add column if not exists issued_by_id    uuid references auth.users(id) on delete set null,
  add column if not exists issued_by_name  text;

-- ---------------------------------------------------------------------------
-- Leave management
-- ---------------------------------------------------------------------------
create table if not exists public.leave_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  leave_type      text not null check (leave_type in ('casual', 'sick', 'unpaid')),
  from_date       date not null,
  to_date         date not null,
  half_day        boolean not null default false,
  days            numeric(4,1) not null check (days > 0),
  reason          text not null,
  document        bytea,
  document_mime   text,
  document_name   text,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by      text,
  decided_at      timestamptz,
  decision_note   text,
  created_at      timestamptz not null default now(),
  check (to_date >= from_date)
);
create index if not exists leave_requests_user_idx on public.leave_requests (user_id, from_date desc);

-- ---------------------------------------------------------------------------
-- In-app notifications (the bell in every portal)
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Activity log: what staff did, for the one-click reports
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id          bigserial primary key,
  user_id     uuid references public.profiles(id) on delete cascade,
  user_name   text,
  role        text,
  action      text not null,
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists activity_log_user_idx on public.activity_log (user_id, created_at desc);
create index if not exists activity_log_time_idx on public.activity_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Lock everything to the service role
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['salary_payments', 'staff_attendance', 'tests', 'test_marks', 'doubts',
                           'doubt_solutions', 'leave_requests', 'notifications', 'activity_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
grant usage, select on all sequences in schema public to service_role;
