-- ============================================================
--  OXEN — Profiles onboarding columns (migration 0008)
--  Run this in Supabase SQL editor (Dashboard → SQL → New query).
--  Idempotent: safe to re-run. Does NOT recreate the profiles table.
--
--  Purpose: ensures all columns required by the Complete Profile
--  onboarding flow exist on public.profiles. If migration 0007 was
--  already applied, this is a no-op. If it was not, this adds every
--  missing column in one shot so the upsert in completeOnboarding
--  does not fail with "Could not find the 'full_name' column".
--
--  Columns added (all nullable unless noted):
--    user_id              uuid   — mirror of profiles.id (= auth.uid())
--    normalized_email     text   — lower(trim(email)) for uniqueness
--    nickname             text   — display nickname (original casing)
--    normalized_nickname  text   — lower(trim(nickname)) for unique index
--    full_name            text   — full name from Google / user metadata
--    onboarding_completed boolean — default false
--
--  This migration does NOT delete or modify existing data.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
--  1. Add missing columns (all IF NOT EXISTS — safe to re-run)
-- ============================================================
alter table public.profiles
  add column if not exists user_id uuid,
  add column if not exists normalized_email text,
  add column if not exists nickname text,
  add column if not exists normalized_nickname text,
  add column if not exists full_name text,
  add column if not exists onboarding_completed boolean not null default false;

-- ============================================================
--  2. Backfill data from existing columns
--     - user_id mirrors id (= auth.uid())
--     - normalized_email from email (trimmed + lowercased)
--     - full_name from name (the original display-name column)
-- ============================================================
update public.profiles
  set user_id = id
  where user_id is null;

update public.profiles
  set normalized_email = lower(trim(email))
  where normalized_email is null and email is not null;

update public.profiles
  set full_name = name
  where full_name is null and name is not null;

-- ============================================================
--  3. Unique indexes (partial — WHERE NOT NULL so existing
--     NULLs don't block inserts)
-- ============================================================
create unique index if not exists profiles_user_id_uniq
  on public.profiles(user_id)
  where user_id is not null;

create unique index if not exists profiles_normalized_nickname_uniq
  on public.profiles(normalized_nickname)
  where normalized_nickname is not null;

create unique index if not exists profiles_normalized_email_uniq
  on public.profiles(normalized_email)
  where normalized_email is not null;

-- ============================================================
--  4. Normalize trigger — keeps normalized_email and
--     normalized_nickname in sync on insert/update.
--     (Replaces if already present from 0007.)
-- ============================================================
create or replace function public.normalize_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null then
    new.normalized_email := lower(trim(new.email));
  end if;
  if new.nickname is not null then
    new.normalized_nickname := lower(trim(new.nickname));
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_normalize_email on public.profiles;
create trigger profiles_normalize_email
  before insert or update of email, nickname on public.profiles
  for each row execute function public.normalize_profile_email();

-- ============================================================
--  5. updated_at touch trigger
-- ============================================================
drop function if exists public.touch_profile_updated_at();
create or replace function public.touch_profile_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_profile_updated_at();

-- ============================================================
--  6. RLS — self select / insert / update
--     (Owners already have read-all from migration 0005.)
-- ============================================================
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- ============================================================
--  DONE.
--  After running, verify the columns exist:
--    select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'profiles'
--    order by column_name;
-- ============================================================
