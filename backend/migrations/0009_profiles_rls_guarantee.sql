-- ============================================================
--  OXEN — Profiles RLS guarantee (migration 0009)
--  Run this in Supabase SQL editor (Dashboard → SQL → New query).
--  Idempotent: safe to re-run.
--
--  PURPOSE: Guarantee that every authenticated user can SELECT,
--  INSERT, and UPDATE exactly one row in public.profiles — their
--  own — where id = auth.uid(). This is the security foundation
--  that makes ensureProfile() work client-side.
--
--  Without these policies, Supabase RLS silently blocks the
--  insert (returns no data, no error), causing users to have a
--  valid Supabase Auth session but NO OXEN profile.
--
--  This migration does NOT:
--    - recreate the profiles table
--    - modify any column or schema
--    - delete or modify existing data
--    - change owner-admin policies (migration 0005)
--
--  It only ensures the three self-access policies exist.
-- ============================================================

-- Ensure RLS is enabled on profiles (no-op if already enabled).
alter table public.profiles enable row level security;

-- ============================================================
--  1. SELECT — a user can read only their own profile
-- ============================================================
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

-- ============================================================
--  2. INSERT — a user can create only their own profile
--     (id must equal auth.uid() — enforced by the CHECK clause)
-- ============================================================
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- ============================================================
--  3. UPDATE — a user can update only their own profile
-- ============================================================
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================
--  DONE.
--  Verify the policies exist:
--    select policyname, cmd from pg_policies
--    where tablename = 'profiles' and schemaname = 'public'
--    order by policyname;
-- ============================================================
