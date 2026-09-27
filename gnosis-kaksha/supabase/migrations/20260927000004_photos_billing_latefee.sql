-- =============================================================================
-- 1. Student photo + signature (uploaded on the admission form / profile)
-- 2. Monthly tuition billing on the 1st, due by the 10th
-- 3. Flat Rs 100 late fee per month when a month's fees are unpaid after the 10th
-- Idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Student documents (kept out of `students` so roster queries stay light)
-- ---------------------------------------------------------------------------
create table if not exists public.student_documents (
  student_id  uuid not null references public.students(id) on delete cascade,
  kind        text not null check (kind in ('photo', 'signature')),
  mime_type   text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  data        bytea not null,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  primary key (student_id, kind)
);
alter table public.student_documents enable row level security;
revoke all on public.student_documents from anon, authenticated;
grant all on public.student_documents to service_role;

-- ---------------------------------------------------------------------------
-- 2 + 3. Billing state on each student
-- ---------------------------------------------------------------------------
alter table public.students
  add column if not exists billed_through  date,              -- first day of the last month billed
  add column if not exists late_fee_due    numeric(10,2) not null default 0,
  add column if not exists late_fee_month  date;              -- first day of the last month fined

-- Existing students: treat the current month (Sept 2026) as already billed and
-- not fined, so billing and fines start cleanly from next month. New students
-- are billed from their admission month (the admission payment covers it).
update public.students
  set billed_through = date_trunc('month', (now() at time zone 'Asia/Kolkata'))::date
  where billed_through is null and admission_date < date_trunc('month', (now() at time zone 'Asia/Kolkata'))::date;
update public.students
  set billed_through = date_trunc('month', admission_date)::date
  where billed_through is null;
update public.students
  set late_fee_month = date_trunc('month', (now() at time zone 'Asia/Kolkata'))::date
  where late_fee_month is null;

alter table public.students alter column billed_through
  set default date_trunc('month', (now() at time zone 'Asia/Kolkata'))::date;

-- How much of a payment was late fee (for the receipt).
alter table public.transactions add column if not exists late_fee numeric(10,2) not null default 0;

-- Bills every month not yet billed and applies late fees. Safe to call as
-- often as you like: billed_through / late_fee_month make it a no-op once done,
-- and the row-level WHERE re-check makes concurrent calls safe.
create or replace function public.run_monthly_billing()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  today   date := (now() at time zone 'Asia/Kolkata')::date;
  cur     date := date_trunc('month', today)::date;
  billed  int;
  fined   int;
begin
  -- Monthly tuition for each month since billed_through (active students only;
  -- a pending admission is billed from when it is approved).
  update public.students s
    set amount_due = coalesce(s.amount_due, 0)
                     + s.tuition_after_scholarship
                       * ((date_part('year', cur) - date_part('year', s.billed_through)) * 12
                          + date_part('month', cur) - date_part('month', s.billed_through)),
        fee_state = case when s.fee_state = 'pending_verification' then s.fee_state else 'due' end,
        billed_through = cur,
        updated_at = now()
    where s.status = 'active'
      and s.billed_through < cur
      and coalesce(s.tuition_after_scholarship, 0) > 0;
  get diagnostics billed = row_count;

  -- Rs 100 once per month when the month is still unpaid after the 10th.
  -- A payment submitted in time (pending verification) is not fined.
  if extract(day from today) > 10 then
    update public.students s
      set amount_due = coalesce(s.amount_due, 0) + 100,
          late_fee_due = s.late_fee_due + 100,
          late_fee_month = cur,
          updated_at = now()
      where s.status = 'active'
        and s.fee_state = 'due'
        and coalesce(s.amount_due, 0) > 0
        and (s.late_fee_month is null or s.late_fee_month < cur);
    get diagnostics fined = row_count;
  end if;

  return billed + coalesce(fined, 0);
end;
$$;
revoke all on function public.run_monthly_billing() from public, anon, authenticated;
grant execute on function public.run_monthly_billing() to service_role;

-- Approvals now also clear late fee first, then tuition.
create or replace function public.review_payment(
  p_transaction_id text,
  p_action         text,
  p_note           text,
  p_reviewer       text
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.transactions;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid action %', p_action using errcode = '22023';
  end if;

  select * into t from public.transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'transaction not found' using errcode = 'P0002';
  end if;
  if t.status <> 'pending' then
    raise exception 'transaction is already %', t.status using errcode = '55000';
  end if;

  if p_action = 'approve' then
    update public.transactions
      set status = 'verified',
          verified_by = p_reviewer,
          verified_at = current_date,
          receipt_number = 'RCPT-' || to_char(now(), 'YYYY') || '-'
                           || lpad(nextval('public.receipt_seq')::text, 4, '0')
      where id = t.id
      returning * into t;

    update public.students
      set amount_due = case when t.purpose = 'admission' then 0
                            else greatest(coalesce(amount_due, 0) - t.amount, 0) end,
          late_fee_due = case when t.purpose = 'admission' then late_fee_due
                              else greatest(late_fee_due - t.amount, 0) end,
          fee_state = case when t.purpose = 'admission'
                             or greatest(coalesce(amount_due, 0) - t.amount, 0) = 0 then 'paid'
                           else 'due' end,
          status = case when t.purpose = 'admission' and status = 'pending' then 'active' else status end,
          -- an approved admission covers its admission month
          billed_through = case when t.purpose = 'admission' and status = 'pending'
                                then greatest(billed_through, date_trunc('month', (now() at time zone 'Asia/Kolkata'))::date)
                                else billed_through end,
          updated_at = now()
      where id = t.student_id;
  else
    if coalesce(btrim(p_note), '') = '' then
      raise exception 'a rejection reason is required' using errcode = '22023';
    end if;

    update public.transactions
      set status = 'rejected',
          rejected_note = btrim(p_note),
          verified_by = p_reviewer,
          verified_at = current_date
      where id = t.id
      returning * into t;

    update public.students s
      set fee_state = 'due', updated_at = now()
      where s.id = t.student_id
        and s.fee_state = 'pending_verification'
        and not exists (select 1 from public.transactions o
                        where o.student_id = s.id and o.status = 'pending');
  end if;

  return t;
end;
$$;
revoke all on function public.review_payment(text, text, text, text) from public, anon, authenticated;
grant execute on function public.review_payment(text, text, text, text) to service_role;
