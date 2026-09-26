-- =============================================================================
-- Manual UPI payment verification: student submits UTR -> pending ->
-- accountant/admin approves or rejects. Idempotent.
-- =============================================================================

-- Columns the verification flow needs (some already exist from schema.sql).
alter table public.transactions
  add column if not exists upi_reference   text,
  add column if not exists rejected_note   text,
  add column if not exists verified_by     text,
  add column if not exists verified_at     date,
  add column if not exists purpose         text not null default 'tuition',
  add column if not exists receipt_number  text,
  add column if not exists submitted_by    uuid references auth.users(id) on delete set null;

alter table public.transactions drop constraint if exists transactions_purpose_check;
alter table public.transactions
  add constraint transactions_purpose_check check (purpose in ('admission', 'tuition', 'other'));

update public.transactions set purpose = 'admission'
  where purpose = 'tuition' and description ilike 'admission%';

alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions
  add constraint transactions_status_check
  check (status in ('verified', 'pending', 'rejected', 'failed'));

alter table public.students drop constraint if exists students_fee_state_check;
alter table public.students
  add constraint students_fee_state_check
  check (fee_state in ('paid', 'due', 'pending_verification'));

-- A UTR can back only one live (pending or verified) payment. Rejected
-- submissions don't block a corrected re-submission.
create unique index if not exists transactions_utr_live_uniq
  on public.transactions (upper(btrim(utr)))
  where utr is not null and status in ('pending', 'verified');

-- At most one submission awaiting review per student (guards double-submits).
create unique index if not exists transactions_one_pending_per_student
  on public.transactions (student_id) where status = 'pending';

create unique index if not exists transactions_receipt_number_uniq
  on public.transactions (receipt_number) where receipt_number is not null;

create sequence if not exists public.receipt_seq;

-- Receipts that were verified before this migration get a number too.
update public.transactions
  set receipt_number = 'RCPT-' || to_char(coalesce(verified_at, date), 'YYYY') || '-'
                       || lpad(nextval('public.receipt_seq')::text, 4, '0')
  where status = 'verified' and receipt_number is null;

-- Atomic approve/reject. Locks the transaction row so two reviewers can't both
-- act on it, and updates the student in the same transaction.
create or replace function public.review_payment(
  p_transaction_id text,
  p_action         text,     -- 'approve' | 'reject'
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

    -- admission payments cover the first month in full; tuition payments are
    -- credited against what is owed
    update public.students
      set amount_due = case when t.purpose = 'admission' then 0
                            else greatest(coalesce(amount_due, 0) - t.amount, 0) end,
          fee_state = case when t.purpose = 'admission'
                             or greatest(coalesce(amount_due, 0) - t.amount, 0) = 0 then 'paid'
                           else 'due' end,
          -- an approved admission payment completes the admission
          status = case when t.purpose = 'admission' and status = 'pending' then 'active' else status end,
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

    -- back to 'due' unless another submission is still awaiting review
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

-- Students with a pending submission show as pending verification.
update public.students s set fee_state = 'pending_verification'
  where s.fee_state = 'due'
    and exists (select 1 from public.transactions t where t.student_id = s.id and t.status = 'pending');
