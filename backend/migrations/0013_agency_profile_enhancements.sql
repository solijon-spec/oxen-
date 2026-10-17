-- ============================================================
--  OXEN — Agency Profile Enhancements
--  Adds contact, social, location, photos, branches, and
--  enhanced license/verification fields to consulting_companies.
--  Idempotent: safe to re-run.
-- ============================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ── Contact fields ──────────────────────────────────────────
alter table public.consulting_companies
  add column if not exists whatsapp text,
  add column if not exists telegram text,
  add column if not exists additional_phone text;

-- ── Social links (stored as jsonb key→url) ──────────────────
alter table public.consulting_companies
  add column if not exists social_links jsonb default '{}'::jsonb;

-- ── Location enhancements ───────────────────────────────────
alter table public.consulting_companies
  add column if not exists map_link text,
  add column if not exists founded_year int;

-- ── Agency photos (jsonb array of URLs) ─────────────────────
alter table public.consulting_companies
  add column if not exists agency_photos jsonb default '[]'::jsonb;

-- ── Branches (jsonb array of {name,address,phone,working_hours,map_link}) ──
alter table public.consulting_companies
  add column if not exists branches jsonb default '[]'::jsonb;

-- ── Enhanced license / verification ─────────────────────────
alter table public.consulting_companies
  add column if not exists license_number text,
  add column if not exists license_document_url text,
  add column if not exists license_issue_date date,
  add column if not exists license_expiry_date date,
  add column if not exists license_issuing_org text,
  add column if not exists registration_document_url text;

-- verification_status already exists from migration 0001;
-- extend the check to include 'not_submitted'
alter table public.consulting_companies
  drop constraint if exists consulting_companies_verification_status_check;
alter table public.consulting_companies
  add constraint consulting_companies_verification_status_check
  check (verification_status in ('not_submitted','pending','verified','rejected'));

-- Default to 'not_submitted' for existing rows that have NULL or 'pending' but no license
update public.consulting_companies
  set verification_status = 'not_submitted'
  where verification_status is null
     or (verification_status = 'pending' and license_info is null and license_number is null);

-- ── Short description (separate from full description) ──────
alter table public.consulting_companies
  add column if not exists short_description text;

-- ── Specialties (text array) ────────────────────────────────
alter table public.consulting_companies
  add column if not exists specialties text[] default '{}';

-- ── Indexes for public agency discovery ─────────────────────
create index if not exists consulting_companies_published_idx
  on public.consulting_companies(is_published)
  where is_published = true;

create index if not exists consulting_companies_verified_idx
  on public.consulting_companies(verification_status)
  where verification_status = 'verified';

-- ── RLS: Public can read published agencies ─────────────────
-- (Existing RLS from migration 0001 may already cover this,
--  but we add a explicit policy for published agencies.)
drop policy if exists "consulting_companies_public_read" on public.consulting_companies;
create policy "consulting_companies_public_read"
  on public.consulting_companies
  for select
  using (is_published = true);

-- ── Updated_at trigger (if not already present) ─────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists consulting_companies_touch_updated on public.consulting_companies;
create trigger consulting_companies_touch_updated
  before update on public.consulting_companies
  for each row execute function public.touch_updated_at();
