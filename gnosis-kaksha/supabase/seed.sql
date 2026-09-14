-- Gnosis Kaksha — optional sample data
-- Run AFTER schema.sql (Supabase dashboard → SQL Editor) to populate the
-- portals with a realistic roster: 8 active students + 2 pending admissions
-- (Kabir Ahmed & Meghna Choudhury) so there is something to approve right away.
--
-- These mirror the in-code sample seed exactly. `id` is left to default
-- (uuid) and `registration_number` is set explicitly to the original values,
-- all below GK-2026-0200 so they never collide with the live sequence.
-- Fee figures are NOT stored — they are computed at read time from
-- class_number + subjects + previous_percentage by lib/fees.ts.
--
-- Idempotent: re-running skips rows whose registration_number already exists.

insert into public.students
  (registration_number, full_name, class_number, stream, board, subjects,
   parent_name, mobile, email, previous_percentage, admission_date, status,
   paid_this_month)
values
  ('GK-2026-0142', 'Ananya Das', 10, null, 'SEBA',
   array['Mathematics','Science','English','Bengali'],
   'Rajib Das', '9876543210', 'ananya.das@example.com', 84, '2026-07-01', 'active', false),

  ('GK-2026-0138', 'Rohan Deb', 12, 'Science', 'CBSE',
   array['Physics','Chemistry','Biology','Mathematics','English'],
   'Sanjib Deb', '9954012233', 'rohan.deb@example.com', 91, '2026-06-18', 'active', true),

  ('GK-2026-0151', 'Priya Nath', 9, null, 'SEBA',
   array['Mathematics','Science','English','History'],
   'Dipankar Nath', '8811223344', 'priya.nath@example.com', 78, '2026-07-05', 'active', true),

  ('GK-2026-0129', 'Imran Hussain', 11, 'Science', 'CBSE',
   array['Physics','Chemistry','Mathematics','English'],
   'Anwar Hussain', '9706551020', 'imran.hussain@example.com', 88, '2026-06-22', 'active', false),

  ('GK-2026-0160', 'Sneha Roy', 7, null, 'SEBA',
   array['Mathematics','Science','English'],
   'Bikash Roy', '9435667788', 'sneha.roy@example.com', 72, '2026-07-10', 'active', true),

  ('GK-2026-0122', 'Arjun Sinha', 12, 'Arts', 'SEBA',
   array['History','Political Science','Economics','Bengali'],
   'Prakash Sinha', '9101223344', 'arjun.sinha@example.com', 65, '2026-06-15', 'active', false),

  ('GK-2026-0175', 'Kabir Ahmed', 5, null, 'SEBA',
   array['Mathematics','Science','English','Bengali','Social Science'],
   'Sahil Ahmed', '9864551122', 'kabir.ahmed@example.com', 95, '2026-08-29', 'pending', false),

  ('GK-2026-0176', 'Meghna Choudhury', 8, null, 'CBSE',
   array['Mathematics','Science','English'],
   'Nabin Choudhury', '9577001234', 'meghna.choudhury@example.com', 81, '2026-08-31', 'pending', false),

  ('GK-2026-0148', 'Farhan Ali', 10, null, 'SEBA',
   array['Mathematics','Science','English'],
   'Kamal Ali', '9127884455', 'farhan.ali@example.com', 69, '2026-07-02', 'active', true),

  ('GK-2026-0163', 'Diya Sarma', 6, null, 'SEBA',
   array['Mathematics','Science','English','Bengali'],
   'Hiren Sarma', '9508112299', 'diya.sarma@example.com', 88, '2026-07-08', 'active', true)
on conflict (registration_number) do nothing;
