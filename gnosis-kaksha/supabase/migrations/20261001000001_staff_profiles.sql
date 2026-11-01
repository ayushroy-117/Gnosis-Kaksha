-- =============================================================================
-- Staff (teacher / accountant) profile details for the faculty ID card, plus a
-- stable public staff code for QR verification. Idempotent.
-- =============================================================================

create table if not exists public.staff_details (
  user_id            uuid primary key references public.profiles(id) on delete cascade,
  staff_code         text not null unique,                 -- printed on the card, looked up by /verify/staff/<code>
  department         text,                                 -- e.g. "English" -> "English Department"
  phone              text,
  father_name        text,
  address            text,
  date_of_joining    date,
  employment_status  text not null default 'active'
                       check (employment_status in ('active', 'resigned', 'terminated')),
  status_changed_on  date,
  updated_at         timestamptz not null default now()
);

alter table public.staff_details enable row level security;
revoke all on public.staff_details from anon, authenticated;
grant all on public.staff_details to service_role;

-- Photo kept apart so list queries stay light (same pattern as student_documents).
create table if not exists public.staff_photos (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  mime_type   text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  data        bytea not null,
  updated_at  timestamptz not null default now()
);
alter table public.staff_photos enable row level security;
revoke all on public.staff_photos from anon, authenticated;
grant all on public.staff_photos to service_role;

-- Existing staff get a row (and the same code the ID card already derived from their id).
insert into public.staff_details (user_id, staff_code)
select p.id,
       'GK-' || case p.role when 'teacher' then 'FAC' else upper(left(p.role, 3)) end
            || '-' || upper(left(replace(p.id::text, '-', ''), 6))
from public.profiles p
where p.role in ('teacher', 'accountant', 'admin')
on conflict (user_id) do nothing;
