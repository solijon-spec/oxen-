-- ============================================================
--  OXEN — Profiles read-all-authenticated RLS fix (migration 0012)
--  Run this in Supabase SQL editor (Dashboard → SQL → New query).
--  Idempotent: safe to re-run.
--
--  PURPOSE: Ensure every authenticated user can SELECT ALL rows
--  in public.profiles (not just their own). This is required for:
--    - Discover page user search (searchDiscover)
--    - Suggested users (getSuggestedUsers)
--    - Profile page viewing other users
--    - Follow system (viewing who to follow)
--    - Messaging (viewing conversation partners)
--
--  Without this policy, only profiles_select_self (id = auth.uid())
--  is active, so Supabase returns zero rows for any query that
--  filters to other users — search appears broken.
--
--  This migration does NOT:
--    - recreate the profiles table
--    - modify any column or schema
--    - delete or modify existing data
--    - change insert/update/delete policies
--    - expose the email column (RLS controls row access, not column
--      access — the client selects only id, username, name, avatar_url,
--      created_at, updated_at; email is never queried by Discover)
--
--  It only ensures the broad SELECT policy exists alongside self-access.
-- ============================================================

-- Ensure RLS is enabled on profiles (no-op if already enabled).
alter table public.profiles enable row level security;

-- ============================================================
--  1. SELECT — authenticated users can read ALL public profiles
--     This is the key policy that makes Discover search work.
--     Replaces the restrictive profiles_select_self-only setup.
-- ============================================================
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

-- ============================================================
--  2. Keep self-read policy (redundant with #1 but harmless and
--     guarantees self-access even if the authenticated policy is
--     ever dropped)
-- ============================================================
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

-- ============================================================
--  3. INSERT — a user can create only their own profile
-- ============================================================
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- ============================================================
--  4. UPDATE — a user can update only their own profile
-- ============================================================
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================
--  5. Owner-admin read (from migration 0005 — keep intact)
-- ============================================================
drop policy if exists "profiles_read_owner" on public.profiles;
create policy "profiles_read_owner" on public.profiles
  for select using (public.is_owner());

-- ============================================================
--  6. Owner-admin update (from migration 0005 — keep intact)
-- ============================================================
drop policy if exists "profiles_update_owner" on public.profiles;
create policy "profiles_update_owner" on public.profiles
  for update using (public.is_owner()) with check (public.is_owner());

-- ============================================================
--  DONE.
--  Verify the policies exist:
--    select policyname, cmd from pg_policies
--    where tablename = 'profiles' and schemaname = 'public'
--    order by policyname;
--
--  You should see:
--    profiles_insert_self        insert
--    profiles_read_owner         select
--    profiles_select_authenticated select
--    profiles_select_self        select
--    profiles_update_owner       update
--    profiles_update_self        update
-- ============================================================
