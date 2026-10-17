-- ============================================================
-- 0021: Ensure consulting storage bucket is public and has
--       broad authenticated RLS policies.
--
--  FIXES: Tour package image uploads fail because the bucket
--  was made private during agency-application work, and/or
--  the UPDATE policy was removed — breaking `upsert: true`.
--
--  This migration:
--    1. Sets the bucket to public (so getPublicUrl works).
--    2. Restores the original broad authenticated policies
--       from migration 0001 (read, insert, update, delete).
--    3. Does NOT remove any path-restrictive policies that
--       may have been added for agency-applications —
--       RLS is OR-based, so the broad policies here allow
--       uploads to any path (including tour-packages/*).
-- ============================================================

-- 1. Ensure bucket exists and is PUBLIC
insert into storage.buckets (id, name, public)
  values ('consulting', 'consulting', true)
  on conflict (id) do update set public = true;

-- 2. Broad read — anyone can read (bucket is public)
drop policy if exists "consulting_bucket_read" on storage.objects;
create policy "consulting_bucket_read" on storage.objects
  for select using (bucket_id = 'consulting');

-- 3. Broad insert — any authenticated user can upload
drop policy if exists "consulting_bucket_upload" on storage.objects;
create policy "consulting_bucket_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'consulting');

-- 4. Broad update — any authenticated user can update/replace
--    (required for upsert, which the upload helper uses)
drop policy if exists "consulting_bucket_update" on storage.objects;
create policy "consulting_bucket_update" on storage.objects
  for update to authenticated using (bucket_id = 'consulting');

-- 5. Broad delete — any authenticated user can delete
drop policy if exists "consulting_bucket_delete" on storage.objects;
create policy "consulting_bucket_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'consulting');

-- Done. Existing path-restrictive policies (if any) remain in effect
-- alongside these broad ones. RLS is additive — if ANY policy
-- allows the operation, it succeeds.
