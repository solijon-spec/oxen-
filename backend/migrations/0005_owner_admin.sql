-- ============================================================
--  OXEN — Owner Admin Panel schema
--  Private administration module for the two platform owners.
--  Idempotent: safe to re-run.
--
--  IMPORTANT:
--  - Does NOT touch existing tables' data (only adds nullable
--    columns + new RLS policies for owner access).
--  - Does NOT disable existing RLS.
--  - Every new table is company/user-isolated.
--  - Owner emails are stored ONLY in owner_admins (never in
--    frontend code). RLS lets a user read only the row whose
--    email matches their own auth email.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
--  1. owner_admins — the two-owner allowlist
-- ============================================================
create table if not exists public.owner_admins (
  id        uuid primary key default gen_random_uuid(),
  email     text not null unique,
  user_id   uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed the two owner emails (user_id is linked when they log in)
insert into public.owner_admins (email) values
  ('solisulhiddinov@gmail.com'),
  ('az1mboevvv@gmail.com')
on conflict (email) do nothing;

alter table public.owner_admins enable row level security;

-- A user can only read the row whose email matches their auth email
drop policy if exists "oa_read_own" on public.owner_admins;
create policy "oa_read_own" on public.owner_admins
  for select using (
    lower(email) = lower(coalesce(
      (select email from auth.users where id = auth.uid()), ''
    ))
  );

-- Owners can update their own row (e.g. link user_id)
drop policy if exists "oa_update_own" on public.owner_admins;
create policy "oa_update_own" on public.owner_admins
  for update using (
    lower(email) = lower(coalesce(
      (select email from auth.users where id = auth.uid()), ''
    ))
  );

-- ============================================================
--  2. Helper: is_owner() — returns true if current user is an owner
-- ============================================================
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.owner_admins oa
    where lower(oa.email) = lower(coalesce(
      (select email from auth.users where id = auth.uid()), ''
    ))
  );
$$;

-- ============================================================
--  3. Extend profiles with owner-admin metadata columns
--     (all nullable — existing rows unaffected)
-- ============================================================
alter table public.profiles
  add column if not exists phone text,
  add column if not exists country text,
  add column if not exists provider text,
  add column if not exists last_login_at timestamptz,
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active','pending','suspended','blocked','deleted')),
  add column if not exists user_type text not null default 'ordinary'
    check (user_type in ('ordinary','consulting_applicant','premium_consulting','owner','manager','employee','cashier'));

-- Trigger: link owner_admins.user_id + update profiles on login
create or replace function public.handle_owner_auth_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Link owner_admins
  update public.owner_admins
    set user_id = new.id, updated_at = now()
    where lower(email) = lower(coalesce(new.email, ''));
  -- Update profile metadata
  update public.profiles
    set last_login_at = now(),
        provider = coalesce(new.raw_user_meta_data ->> 'provider',
                           new.app_metadata ->> 'provider',
                           profiles.provider),
        email = coalesce(new.email, profiles.email)
    where id = new.id;
  return new;
end;
$$;

drop trigger if exists owner_auth_link_trigger on auth.users;
create trigger owner_auth_link_trigger
  after insert or update on auth.users
  for each row execute function public.handle_owner_auth_link();

-- RLS: owners can read ALL profiles
drop policy if exists "profiles_read_owner" on public.profiles;
create policy "profiles_read_owner" on public.profiles
  for select using (public.is_owner());

-- RLS: owners can update profiles (change user_type, account_status)
drop policy if exists "profiles_update_owner" on public.profiles;
create policy "profiles_update_owner" on public.profiles
  for update using (public.is_owner());

-- ============================================================
--  4. owner_payment_requests — consulting payment verification
-- ============================================================
create table if not exists public.owner_payment_requests (
  id                   uuid primary key default gen_random_uuid(),
  consulting_company_id uuid references public.consulting_companies(id) on delete cascade,
  user_id              uuid,
  user_email           text,
  user_name            text,
  user_avatar_url      text,
  company_name         text,
  company_phone        text,
  plan                 text not null check (plan in ('monthly','quarterly','annual')),
  duration_months      int not null,
  amount               numeric(12,2) not null,
  currency             text not null default 'USD',
  payment_method       text,
  payment_date         timestamptz,
  transaction_reference text,
  receipt_url          text,
  application_date     timestamptz not null default now(),
  verification_status  text not null default 'pending_verification'
    check (verification_status in ('pending_verification','confirmed','rejected','more_info_required','refunded','cancelled')),
  owner_notes          text,
  reviewed_by          uuid,
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists owner_pay_req_status_idx
  on public.owner_payment_requests(verification_status);
create index if not exists owner_pay_req_user_idx
  on public.owner_payment_requests(user_id);

alter table public.owner_payment_requests enable row level security;

drop policy if exists "opr_owner_all" on public.owner_payment_requests;
create policy "opr_owner_all" on public.owner_payment_requests
  for all using (public.is_owner()) with check (public.is_owner());

-- The submitting user can read their own request
drop policy if exists "opr_user_own" on public.owner_payment_requests;
create policy "opr_user_own" on public.owner_payment_requests
  for select using (user_id = auth.uid());

-- The submitting user can insert their own request
drop policy if exists "opr_user_insert" on public.owner_payment_requests;
create policy "opr_user_insert" on public.owner_payment_requests
  for insert with check (user_id = auth.uid());

-- ============================================================
--  5. owner_audit_logs — every owner action is recorded
-- ============================================================
create table if not exists public.owner_audit_logs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,
  owner_email text,
  action      text not null,
  entity_type text,
  entity_id   text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists owner_audit_owner_idx on public.owner_audit_logs(owner_id);
create index if not exists owner_audit_created_idx on public.owner_audit_logs(created_at desc);

alter table public.owner_audit_logs enable row level security;

drop policy if exists "oal_owner_all" on public.owner_audit_logs;
create policy "oal_owner_all" on public.owner_audit_logs
  for all using (public.is_owner()) with check (public.is_owner());

-- ============================================================
--  6. owner_user_notes — internal notes on users
-- ============================================================
create table if not exists public.owner_user_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  owner_id   uuid not null,
  note       text not null,
  created_at timestamptz not null default now()
);

create index if not exists owner_notes_user_idx on public.owner_user_notes(user_id);

alter table public.owner_user_notes enable row level security;

drop policy if exists "oun_owner_all" on public.owner_user_notes;
create policy "oun_owner_all" on public.owner_user_notes
  for all using (public.is_owner()) with check (public.is_owner());

-- ============================================================
--  7. owner_subscription_history — full renewal/extension history
-- ============================================================
create table if not exists public.owner_subscription_history (
  id                   uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  plan                 text not null check (plan in ('monthly','quarterly','annual')),
  start_date           timestamptz not null,
  end_date             timestamptz not null,
  amount               numeric(12,2),
  currency             text default 'USD',
  action_type          text not null check (action_type in ('activation','extension','upgrade','suspension','reactivation','cancellation','plan_change','custom')),
  performed_by         uuid not null,
  performed_by_email   text,
  note                 text,
  created_at           timestamptz not null default now()
);

create index if not exists owner_sub_hist_company_idx
  on public.owner_subscription_history(consulting_company_id);

alter table public.owner_subscription_history enable row level security;

drop policy if exists "osh_owner_all" on public.owner_subscription_history;
create policy "osh_owner_all" on public.owner_subscription_history
  for all using (public.is_owner()) with check (public.is_owner());

-- ============================================================
--  8. Owner RLS policies on existing consulting tables
--     (owners can read all, for admin overview)
-- ============================================================

-- consulting_companies: owners can read all
drop policy if exists "cc_read_owner" on public.consulting_companies;
create policy "cc_read_owner" on public.consulting_companies
  for select using (public.is_owner());

-- owners can update (activate, suspend, extend)
drop policy if exists "cc_update_owner" on public.consulting_companies;
create policy "cc_update_owner" on public.consulting_companies
  for update using (public.is_owner());

-- consulting_subscriptions: owners can read all
drop policy if exists "cs_read_owner" on public.consulting_subscriptions;
create policy "cs_read_owner" on public.consulting_subscriptions
  for select using (public.is_owner());

-- owners can insert (manual activation)
drop policy if exists "cs_insert_owner" on public.consulting_subscriptions;
create policy "cs_insert_owner" on public.consulting_subscriptions
  for insert with check (public.is_owner());

-- owners can update
drop policy if exists "cs_update_owner" on public.consulting_subscriptions;
create policy "cs_update_owner" on public.consulting_subscriptions
  for update using (public.is_owner());

-- consulting_members: owners can read all
drop policy if exists "cm_read_owner" on public.consulting_members;
create policy "cm_read_owner" on public.consulting_members
  for select using (public.is_owner());

-- owners can insert (manual activation — create owner member row)
drop policy if exists "cm_insert_owner" on public.consulting_members;
create policy "cm_insert_owner" on public.consulting_members
  for insert with check (public.is_owner());

-- consulting_payments: owners can read all
drop policy if exists "pm_read_owner" on public.consulting_payments;
create policy "pm_read_owner" on public.consulting_payments
  for select using (public.is_owner());

-- owners can insert (record subscription payment)
drop policy if exists "pm_insert_owner" on public.consulting_payments;
create policy "pm_insert_owner" on public.consulting_payments
  for insert with check (public.is_owner());

-- ============================================================
--  9. updated_at trigger for owner tables
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists owner_admins_touch on public.owner_admins;
create trigger owner_admins_touch before update on public.owner_admins
  for each row execute function public.touch_updated_at();

drop trigger if exists owner_pay_req_touch on public.owner_payment_requests;
create trigger owner_pay_req_touch before update on public.owner_payment_requests
  for each row execute function public.touch_updated_at();
