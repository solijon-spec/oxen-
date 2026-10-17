-- ============================================================
--  OXEN — Ensure profiles SELECT policy for messaging (0022)
--  Run this in Supabase SQL editor (Dashboard → SQL → New query).
--  Idempotent: safe to re-run.
--
--  PURPOSE: Ensure every authenticated user can SELECT ALL rows
--  in public.profiles. This is required for messaging:
--    - Viewing conversation partners' names and avatars
--    - Discover page user search
--    - Profile page viewing other users
--    - Follow system
--
--  Without this policy, getSocialProfile(otherUserId) returns
--  null due to RLS, and the Messages page shows "User" with a
--  fallback avatar for every conversation participant.
--
--  This migration does NOT:
--    - recreate the profiles table
--    - modify any column or schema
--    - delete or modify existing data
--    - change insert/update/delete policies
--    - expose private profile data (RLS controls row access,
--      not column access — the client selects only public fields)
--
--  It only ensures the broad SELECT policy exists.
-- ============================================================

-- Ensure RLS is enabled on profiles (no-op if already enabled).
alter table public.profiles enable row level security;

-- 1. SELECT — authenticated users can read ALL public profiles
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

-- 2. Keep self-read policy (redundant but guarantees self-access)
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

-- 3. Keep owner-admin read policy
drop policy if exists "profiles_read_owner" on public.profiles;
create policy "profiles_read_owner" on public.profiles
  for select using (public.is_owner());

-- ============================================================
--  DONE.
--  Verify the policies exist:
--    select policyname, cmd from pg_policies
--    where tablename = 'profiles' and schemaname = 'public'
--    order by policyname;
-- ============================================================
