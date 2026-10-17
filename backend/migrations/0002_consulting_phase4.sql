-- ============================================================
--  OXEN — Consulting Business Phase 4 schema
--  Adds: license_info + is_published on companies,
--        consulting_package_media (gallery/video for packages),
--        client status history (lightweight, derived from notes),
--        indexes for Phase 4 queries.
--  Run this in Supabase SQL editor (Dashboard → SQL → New query).
--  Idempotent: safe to re-run. Depends on 0001_consulting_phase1.sql.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
--  1. consulting_companies — public profile fields
-- ============================================================
alter table public.consulting_companies
  add column if not exists license_info text,
  add column if not exists is_published boolean not null default false;

-- Allow public read when is_published = true (in addition to the
-- existing "verified" rule from migration 0001).
drop policy if exists "cc_read_member" on public.consulting_companies;
create policy "cc_read_member" on public.consulting_companies
  for select using (
    public.is_consulting_member(id)
    or verification_status = 'verified'
    or is_published = true
    or owner_id = auth.uid()
  );

-- ============================================================
--  2. consulting_package_media — gallery images + videos
--     A package can have many media items (images, one video).
--     RLS mirrors consulting_packages (members read; public reads
--     only when the parent package is_published = true).
-- ============================================================
create table if not exists public.consulting_package_media (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  package_id uuid not null references public.consulting_packages(id) on delete cascade,
  kind text not null default 'image' check (kind in ('image','video')),
  url text not null,
  title text,
  position int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists consulting_package_media_package_idx
  on public.consulting_package_media(package_id);
create index if not exists consulting_package_media_company_idx
  on public.consulting_package_media(consulting_company_id);

alter table public.consulting_package_media enable row level security;

-- Read: members of the company OR public when parent package is published
drop policy if exists "pm_read" on public.consulting_package_media;
create policy "pm_read" on public.consulting_package_media
  for select using (
    public.is_consulting_member(consulting_company_id)
    or exists (
      select 1 from public.consulting_packages p
      where p.id = package_id and p.is_published = true
    )
  );

drop policy if exists "pm_insert" on public.consulting_package_media;
create policy "pm_insert" on public.consulting_package_media
  for insert with check (public.is_consulting_member(consulting_company_id));

drop policy if exists "pm_update" on public.consulting_package_media;
create policy "pm_update" on public.consulting_package_media
  for update using (public.is_consulting_member(consulting_company_id));

drop policy if exists "pm_delete" on public.consulting_package_media;
create policy "pm_delete" on public.consulting_package_media
  for delete using (public.is_consulting_member(consulting_company_id));

-- updated_at trigger for the new table
drop trigger if exists set_updated_at on public.consulting_package_media;
create trigger set_updated_at before update on public.consulting_package_media
  for each row execute function public.set_updated_at();

-- ============================================================
--  3. consulting_client_status_history — lightweight status log
--     (separate from consulting_client_notes; records every
--      application_status change with previous/new/changed_by/note)
-- ============================================================
create table if not exists public.consulting_client_status_history (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  client_id uuid not null references public.consulting_clients(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists consulting_client_status_history_client_idx
  on public.consulting_client_status_history(client_id);

alter table public.consulting_client_status_history enable row level security;

drop policy if exists "csh_read" on public.consulting_client_status_history;
create policy "csh_read" on public.consulting_client_status_history
  for select using (public.is_consulting_member(consulting_company_id));

drop policy if exists "csh_insert" on public.consulting_client_status_history;
create policy "csh_insert" on public.consulting_client_status_history
  for insert with check (public.is_consulting_member(consulting_company_id));

-- updated_at trigger (harmless; table has no updated_at column but trigger is safe to skip)
-- (No updated_at column on this table — history is append-only.)

-- ============================================================
--  4. Extra indexes for Phase 4 queries
-- ============================================================
create index if not exists consulting_packages_published_idx
  on public.consulting_packages(is_published);
create index if not exists consulting_clients_archived_idx
  on public.consulting_clients(is_archived);

-- Done.
