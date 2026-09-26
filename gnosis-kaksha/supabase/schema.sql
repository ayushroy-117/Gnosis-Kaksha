-- =============================================================================
-- Gnosis Kaksha — Full Database Schema
-- =============================================================================
-- Run this entire file in: Supabase Dashboard → SQL Editor → Run
-- It is idempotent (safe to re-run).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. STUDENTS (core roster — the single source of truth)
-- ---------------------------------------------------------------------------
-- Registration numbers: GK-<year>-<4-digit seq>
-- Starts at 200 so it never collides with the seeded demo students (0122–0176).
create sequence if not exists public.student_reg_seq start 200;

create table if not exists public.students (
  id                        uuid primary key default gen_random_uuid(),
  registration_number       text unique not null
    default ('GK-' || to_char(now(), 'YYYY') || '-' ||
             lpad(nextval('public.student_reg_seq')::text, 4, '0')),

  -- Identity
  full_name                 text not null,
  gender                    text,                        -- 'Male' | 'Female' | 'Others'
  dob                       date,
  religion                  text,
  category                  text,                        -- 'General' | 'OBC' | 'SC' | 'ST'
  mobile                    text,
  email                     text,

  -- Parent / Guardian
  parent_name               text,
  mother_name               text,
  parent_phone              text,
  address                   text,

  -- Academic
  class_number              int  not null,
  stream                    text,                        -- null | 'Science' | 'Arts'
  board                     text not null default 'SEBA',-- 'SEBA' | 'CBSE' | 'ICSE'
  school_name               text,
  previous_percentage       numeric not null default 0,

  -- Enrollment
  subjects                  text[] not null default '{}',
  scholarship_percent       numeric(5,2) default 0,
  monthly_tuition           numeric(10,2) default 0,
  tuition_after_scholarship numeric(10,2) default 0,
  mandatory_charges         numeric(10,2) default 950,   -- exam ₹350 + tshirt ₹600
  tshirt_size               text,
  document_type             text,

  -- Documents (Supabase Storage paths)
  student_photo_path        text,
  student_signature_path    text,
  parent_signature_path     text,
  profile_photo_url         text,

  -- Status & Payment
  status                    text not null default 'pending'
                              check (status in ('pending', 'active', 'rejected')),
  fee_state                 text not null default 'due'
                              check (fee_state in ('paid', 'due')),
  amount_due                numeric(10,2) default 0,

  -- Metadata
  admission_date            date not null default current_date,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists students_status_idx       on public.students (status);
create index if not exists students_class_idx        on public.students (class_number);
create index if not exists students_reg_number_idx   on public.students (registration_number);


-- ---------------------------------------------------------------------------
-- 2. TRANSACTIONS (fee payment ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id            text primary key,                        -- e.g. RCPT-2026-0925
  student_id    uuid references public.students(id) on delete cascade,
  student_name  text not null,
  description   text not null,
  amount        numeric(10,2) not null,
  method        text not null default 'UPI'
                  check (method in ('UPI', 'Cash', 'Card', 'Bank Transfer')),
  utr           text,                                    -- UPI transaction reference
  status        text not null default 'pending'
                  check (status in ('verified', 'pending', 'failed')),
  date          date not null default current_date,
  created_at    timestamptz not null default now()
);

create index if not exists transactions_student_idx  on public.transactions (student_id);
create index if not exists transactions_status_idx   on public.transactions (status);


-- ---------------------------------------------------------------------------
-- 3. TEACHERS
-- ---------------------------------------------------------------------------
create table if not exists public.teachers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  role          text not null,                           -- e.g. 'Physics Teacher', 'Founder & CEO'
  subjects      text[] not null,                        -- e.g. ['Physics']
  qualification text not null,
  photo_url     text,
  display_order int default 0,
  is_active     boolean default true,
  created_at    timestamptz default now()
);


-- ---------------------------------------------------------------------------
-- 4. GALLERY IMAGES
-- ---------------------------------------------------------------------------
create table if not exists public.gallery_images (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  caption       text,
  image_url     text not null,
  event_tag     text,                                    -- e.g. 'HSLC Felicitation'
  display_order int default 0,
  is_featured   boolean default false,
  created_at    timestamptz default now()
);


-- ---------------------------------------------------------------------------
-- 5. NOTICES (public notice board)
-- ---------------------------------------------------------------------------
create table if not exists public.notices (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  content       text,
  external_url  text,                                    -- link to external PDF/URL
  audience      text not null default 'All'
                  check (audience in ('All', 'Students', 'Parents', 'Staff')),
  is_pinned     boolean default false,
  is_active     boolean default true,
  published_at  timestamptz default now(),
  created_at    timestamptz default now()
);


-- ---------------------------------------------------------------------------
-- 6. CONTACT MESSAGES
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text,
  phone         text,
  message       text not null,
  is_read       boolean default false,
  created_at    timestamptz default now()
);


-- ---------------------------------------------------------------------------
-- 7. SUBJECT ALLOCATION REQUESTS (teacher → admin)
-- ---------------------------------------------------------------------------
create table if not exists public.allocation_requests (
  id                  text primary key,
  student_id          uuid references public.students(id) on delete cascade,
  student_name        text not null,
  registration_number text not null,
  subject             text not null,
  class_number        int  not null,
  requested_by        text not null,                     -- teacher name/email
  status              text not null default 'PENDING'
                        check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_note      text,
  created_at          date not null default current_date,
  resolved_at         date
);


-- ---------------------------------------------------------------------------
-- 8. STAFF (admin/accountant/teacher accounts, linked to Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  role        text not null check (role in ('admin', 'accountant', 'teacher')),
  is_active   boolean default true,
  created_at  timestamptz default now()
);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- students: only service-role (server) can read/write
alter table public.students enable row level security;

-- transactions: only service-role
alter table public.transactions enable row level security;

-- teachers: public can read, service-role writes
alter table public.teachers enable row level security;
create policy "Public read teachers"
  on public.teachers for select using (is_active = true);

-- gallery_images: public can read
alter table public.gallery_images enable row level security;
create policy "Public read gallery"
  on public.gallery_images for select using (true);

-- notices: public can read active notices
alter table public.notices enable row level security;
create policy "Public read notices"
  on public.notices for select using (is_active = true);

-- contact_messages: anyone can insert, service-role reads
alter table public.contact_messages enable row level security;
create policy "Anyone can send contact message"
  on public.contact_messages for insert with check (true);

-- allocation_requests: service-role only
alter table public.allocation_requests enable row level security;

-- staff: service-role only
alter table public.staff enable row level security;


-- =============================================================================
-- SEED DATA
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Teachers
-- ---------------------------------------------------------------------------
insert into public.teachers (name, role, subjects, qualification, photo_url, display_order) values
  ('Ankur Kumar Nath',  'Founder & CEO, Physics Teacher',          array['Physics'],                          'B.Sc in Physics Hons',                          'https://gnosiskaksha.in/php/uploaded_profile/ankur.webp',        1),
  ('Jumki Roy',         'English Teacher & Accountant',            array['English'],                          'B.A, M.A',                                      'https://gnosiskaksha.in/php/uploaded_profile/jumki.png',         2),
  ('Susmita Nath',      'Bengali Teacher',                         array['Bengali'],                          'B.A, M.A, B.Ed',                                'https://gnosiskaksha.in/php/uploaded_profile/susmita.png',       3),
  ('Barnali Paul',      'Biology Teacher',                         array['Biology'],                          'M.Sc.(Gold), B.Sc.(Silver), B.Ed., CTET',       'https://gnosiskaksha.in/php/uploaded_profile/barnali.jpg',       4),
  ('Riya Nath',         'History Teacher',                         array['History'],                          'B.A',                                           'https://gnosiskaksha.in/php/uploaded_profile/riya nath.png',     5),
  ('Joydeep Dey',       'Mathematics Teacher',                     array['Mathematics'],                      'B.Sc in Maths Hons, B.Ed',                      'https://gnosiskaksha.in/php/uploaded_profile/joydeep dey.png',   6),
  ('Anal Choudhary',    'English Teacher',                         array['English'],                          'B.A, D.EL.ED, ATET',                            'https://gnosiskaksha.in/php/uploaded_profile/anal.png',          7),
  ('Abu Sahid',         'Economics Teacher',                       array['Economics'],                        'B.A, M.A in Economics, B.Ed',                   'https://gnosiskaksha.in/php/uploaded_profile/abu sahid.png',     8),
  ('Md. Ali Hasan',     'History & Political Science Teacher',     array['History','Political Science'],      'B.A, M.A in History',                           'https://gnosiskaksha.in/php/uploaded_profile/md ali hasan.png',  9),
  ('Sanjib Paul',       'Mathematics Teacher',                     array['Mathematics'],                      'B.Sc',                                          'https://gnosiskaksha.in/php/uploaded_profile/sanjib.png',       10)
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- Gallery Images
-- ---------------------------------------------------------------------------
insert into public.gallery_images (title, caption, image_url, event_tag, display_order, is_featured) values
  ('HSLC Batch Felicitation Program',   'A proud occasion to honour the hard work, dedication, and success of our HSLC batch students.',   '/gallery/gallery_1776019382_a5185fce.png', 'HSLC Felicitation', 1, true),
  ('Class 10 Board Results 2026',       'Some victories are more than marks… they are proof of hard work, sleepless nights, and dreams fulfilled.', '/gallery/gallery_1776019823_d13fdc8a.png', 'Results',           2, true),
  ('Class 8 Batch',                     'Meet the Mentors of Class 8th Foundation Batch',                                                    '/gallery/gallery_1776019930_4c42e5b9.png', 'Batch',             3, false),
  ('Class 9 Batch',                     'Meet the Mentors of Class 9th Growth Batch',                                                        '/gallery/gallery_1776020047_d2448a35.png', 'Batch',             4, false),
  ('Class 10 Batch',                    'Meet the Mentors of Class 10th Board Achievers Batch',                                              '/gallery/gallery_1776019382_a5185fce.png', 'Batch',             5, false),
  ('Class 11 Science Batch',            'Meet the Mentors of Class 11 Science Pioneer Batch',                                                '/gallery/gallery_1776019823_d13fdc8a.png', 'Batch',             6, false),
  ('Class 11 Arts Batch',               'Meet the Mentors of Class 11 Arts Vision Batch',                                                    '/gallery/gallery_1776019930_4c42e5b9.png', 'Batch',             7, false),
  ('Class 12 Science Batch',            'Meet the Mentors of Class 12 Science Rankers Batch',                                                '/gallery/gallery_1776020047_d2448a35.png', 'Batch',             8, false),
  ('Class 12 Arts Batch',               'Meet the Mentors of Class 12 Arts Success Batch',                                                   '/gallery/gallery_1776019382_a5185fce.png', 'Batch',             9, false)
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- Notices
-- ---------------------------------------------------------------------------
insert into public.notices (title, content, external_url, audience, is_pinned, is_active) values
  ('Classes Timing : VI to X',                                    null, 'http://surl.li/sfglv',  'All',      true,  true),
  ('NOTICE',                                                       null, 'https://rb.gy/dvjko6', 'All',      false, true),
  ('Holiday Notice & classes time changes on (17/04/2024)',        null, 'https://rb.gy/zbqi6s', 'All',      false, true),
  ('Half-Yearly Examination Schedule',
    'Half-yearly exams for Classes VI–X begin on 22 September 2026. Datesheets are on the notice board.',
    null, 'All', true, true),
  ('September Fee Collection Window',
    'Monthly tuition for September 2026 is due by the 10th. Please remind guardians with pending dues.',
    null, 'Staff', true, true),
  ('Parent–Teacher Meeting',
    'A PTM for all classes is scheduled for 20 September 2026, 10:00 AM at the main campus.',
    null, 'Parents', false, true),
  ('New Study Material Uploaded',
    'Chapter-wise practice sheets for Mathematics and Science have been added to the materials library.',
    null, 'Students', false, true)
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- Sample Students (matches the in-memory seed in institute-store.ts)
-- Idempotent: skips rows whose registration_number already exists.
-- ---------------------------------------------------------------------------
insert into public.students
  (registration_number, full_name, class_number, stream, board, subjects,
   parent_name, mobile, email, previous_percentage, scholarship_percent,
   monthly_tuition, tuition_after_scholarship, mandatory_charges,
   fee_state, amount_due, admission_date, status)
values
  ('GK-2026-0142', 'Ananya Das',        10, null,      'SEBA', array['Mathematics','Science','English','Bengali'],
   'Rajib Das',         '9876543210', 'ananya.das@example.com',         84, 20, 2500, 2000, 950, 'due',  2000, '2026-07-01', 'active'),

  ('GK-2026-0138', 'Rohan Deb',         12, 'Science', 'CBSE', array['Physics','Chemistry','Biology','Mathematics','English'],
   'Sanjib Deb',        '9954012233', 'rohan.deb@example.com',          91, 30, 4150, 2905, 950, 'paid', 0,    '2026-06-18', 'active'),

  ('GK-2026-0151', 'Priya Nath',         9, null,      'SEBA', array['Mathematics','Science','English','History'],
   'Dipankar Nath',     '8811223344', 'priya.nath@example.com',         78, 10, 2300, 2070, 950, 'paid', 0,    '2026-07-05', 'active'),

  ('GK-2026-0129', 'Imran Hussain',     11, 'Science', 'CBSE', array['Physics','Chemistry','Mathematics','English'],
   'Anwar Hussain',     '9706551020', 'imran.hussain@example.com',      88, 20, 3000, 2400, 950, 'due',  2400, '2026-06-22', 'active'),

  ('GK-2026-0160', 'Sneha Roy',          7, null,      'SEBA', array['Mathematics','Science','English'],
   'Bikash Roy',        '9435667788', 'sneha.roy@example.com',          72, 10, 1600, 1440, 950, 'paid', 0,    '2026-07-10', 'active'),

  ('GK-2026-0122', 'Arjun Sinha',       12, 'Arts',    'SEBA', array['History','Political Science','Economics','Bengali'],
   'Prakash Sinha',     '9101223344', 'arjun.sinha@example.com',        65,  0, 2700, 2700, 950, 'due',  2700, '2026-06-15', 'active'),

  ('GK-2026-0175', 'Kabir Ahmed',        5, null,      'SEBA', array['Mathematics','Science','English','Bengali','Social Science'],
   'Sahil Ahmed',       '9864551122', 'kabir.ahmed@example.com',        95, 30, 2300, 1610, 950, 'due',  1610, '2026-08-29', 'pending'),

  ('GK-2026-0176', 'Meghna Choudhury',   8, null,      'CBSE', array['Mathematics','Science','English'],
   'Nabin Choudhury',   '9577001234', 'meghna.choudhury@example.com',  81, 20, 1700, 1360, 950, 'due',  1360, '2026-08-31', 'pending'),

  ('GK-2026-0148', 'Farhan Ali',        10, null,      'SEBA', array['Mathematics','Science','English'],
   'Kamal Ali',         '9127884455', 'farhan.ali@example.com',         69,  0, 2000, 2000, 950, 'paid', 0,    '2026-07-02', 'active'),

  ('GK-2026-0163', 'Diya Sarma',         6, null,      'SEBA', array['Mathematics','Science','English','Bengali'],
   'Hiren Sarma',       '9508112299', 'diya.sarma@example.com',         88, 20, 1900, 1520, 950, 'paid', 0,    '2026-07-08', 'active')

on conflict (registration_number) do nothing;


-- =============================================================================
-- MIGRATION: Dynamic UPI QR Payment Verification Flow
-- Run this block after the base schema if upgrading an existing database.
-- Safe to re-run (uses IF NOT EXISTS / DO NOTHING patterns).
-- =============================================================================

-- 1. Allow 'pending_verification' as a fee_state on students
alter table public.students
  drop constraint if exists students_fee_state_check;

alter table public.students
  add constraint students_fee_state_check
    check (fee_state in ('paid', 'due', 'pending_verification'));

-- 2. Allow 'rejected' as a transaction status
alter table public.transactions
  drop constraint if exists transactions_status_check;

alter table public.transactions
  add constraint transactions_status_check
    check (status in ('verified', 'pending', 'rejected', 'failed'));

-- 3. New columns on transactions for the verification workflow
alter table public.transactions
  add column if not exists upi_reference  text,           -- unique tr= param from QR
  add column if not exists rejected_note  text,           -- reason if rejected
  add column if not exists verified_by    text,           -- accountant name/email
  add column if not exists verified_at    date;           -- date of approval/rejection

create index if not exists transactions_upi_reference_idx on public.transactions (upi_reference);
create index if not exists transactions_pending_idx        on public.transactions (status) where status = 'pending';

