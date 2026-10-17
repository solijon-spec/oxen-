-- ============================================================
--  OXEN — Auth & Onboarding schema (migration 0007)
--  Run this in Supabase SQL editor (Dashboard → SQL → New query).
--  Idempotent: safe to re-run.
--
--  Adds: normalized_email, nickname, normalized_nickname, full_name,
--        onboarding_completed, user_id (mirror of profiles.id) columns.
--  Adds: unique indexes on user_id and normalized_nickname.
--  Adds: idempotent profile-creation trigger (replaces competing systems).
--  Adds: duplicate-profile detection view for manual review.
--
--  IMPORTANT: This migration does NOT delete any existing data.
--  Duplicate profiles (if any) are surfaced via the
--  `duplicate_profile_emails` view for manual review.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
--  1. Add missing columns to profiles
-- ============================================================
alter table public.profiles
  add column if not exists user_id uuid,
  add column if not exists normalized_email text,
  add column if not exists nickname text,
  add column if not exists normalized_nickname text,
  add column if not exists full_name text,
  add column if not exists onboarding_completed boolean not null default false;

-- ============================================================
--  2. Backfill user_id from id (they mirror auth.uid())
--     Keep existing rows intact — never delete.
-- ============================================================
update public.profiles
  set user_id = id
  where user_id is null;

-- Backfill normalized_email from email (trimmed + lowercased)
update public.profiles
  set normalized_email = lower(trim(email))
  where normalized_email is null and email is not null;

-- Backfill full_name from name for existing rows
update public.profiles
  set full_name = name
  where full_name is null and name is not null;

-- ============================================================
--  3. Unique indexes
--     - user_id: one auth user = one profile
--     - normalized_nickname: case-insensitive unique nickname
--     - normalized_email: prevents duplicate accounts by email
--     Partial indexes (WHERE NOT NULL) so existing NULLs don't block.
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
--  4. Idempotent profile-creation trigger
--     Replaces any competing profile-init system with a single
--     upsert-on-user_id trigger on auth.users.
--     Uses INSERT ... ON CONFLICT to guarantee exactly one profile
--     per auth user — safe across OAuth retries and refreshes.
-- ============================================================

-- Drop legacy trigger if it exists (from earlier schemas)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_email text;
  v_avatar text;
  v_provider text;
begin
  v_email   := lower(trim(coalesce(new.email, '')));
  v_name    := coalesce(
                 new.raw_user_meta_data ->> 'full_name',
                 new.raw_user_meta_data ->> 'name',
                 new.user_metadata ->> 'full_name',
                 split_part(v_email, '@', 1)
               );
  v_avatar  := coalesce(
                 new.raw_user_meta_data ->> 'avatar_url',
                 new.raw_user_meta_data ->> 'picture',
                 new.user_metadata ->> 'avatar_url'
               );
  v_provider := coalesce(
                  new.raw_user_meta_data ->> 'provider',
                  new.app_metadata ->> 'provider'
                );

  -- Idempotent upsert: if a profile for this auth uid already
  -- exists, update mutable fields. Otherwise insert exactly one.
  insert into public.profiles (id, user_id, email, normalized_email, name, full_name, avatar_url, provider, onboarding_completed)
  values (
    new.id,
    new.id,
    coalesce(new.email, v_email),
    nullif(v_email, ''),
    v_name,
    v_name,
    nullif(v_avatar, ''),
    nullif(v_provider, ''),
    false
  )
  on conflict (id) do update
    set email              = coalesce(excluded.email, profiles.email),
        normalized_email   = coalesce(nullif(v_email, ''), profiles.normalized_email),
        full_name          = coalesce(excluded.full_name, profiles.full_name),
        avatar_url         = coalesce(excluded.avatar_url, profiles.avatar_url),
        provider           = coalesce(excluded.provider, profiles.provider),
        updated_at         = now()
    where profiles.id = new.id;

  return new;
end;
$$;

-- Attach to auth.users — fires on signup + OAuth callback
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  5. Normalize email on update (trim + lowercase)
--     Keeps normalized_email in sync if email ever changes.
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
--  6. Duplicate-profile detection view
--     Shows profiles that share the same normalized_email
--     (case-insensitive duplicates). For MANUAL review only —
--     this migration does NOT auto-delete any data.
-- ============================================================
create or replace view public.duplicate_profile_emails as
  select
    normalized_email,
    count(*) as profile_count,
    array_agg(id order by created_at) as profile_ids,
    array_agg(name order by created_at) as profile_names,
    array_agg(created_at order by created_at) as created_ats
  from public.profiles
  where normalized_email is not null
  group by normalized_email
  having count(*) > 1;

comment on view public.duplicate_profile_emails is
  'Profiles sharing the same normalized email (case-insensitive). For manual review — do not auto-delete.';

-- ============================================================
--  7. RLS — keep existing policies, ensure self-access works
--     for the new columns. Owners already have read-all via
--     migration 0005. Users can read/update their own profile.
-- ============================================================
-- Self-read (may already exist — safe to re-create)
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

-- Self-update
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- Self-insert (for edge function / client-initiated profile completion)
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- ============================================================
--  8. updated_at touch trigger (if not already present)
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
--  DONE.
--  After running, check for duplicates:
--    select * from public.duplicate_profile_emails;
--  If any rows appear, review manually before merging.
-- ============================================================
