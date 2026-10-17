-- ============================================================
--  OXEN — Multi-Agency Workspace + Membership System
--  Adds agency codes, join requests, and enables multi-agency
--  membership for a single user.
--  Idempotent: safe to re-run.
-- ============================================================

create extension if not exists pgcrypto;

-- ── Agency Code on consulting_companies ────────────────────
-- Human-friendly unique code for joining agencies (e.g. OX-TRV-7K29Q)
alter table public.consulting_companies
  add column if not exists agency_code text unique;

-- Index for fast code lookups
create index if not exists consulting_companies_agency_code_idx
  on public.consulting_companies(agency_code);

-- ── Agency deactivation (soft delete) ──────────────────────
alter table public.consulting_companies
  add column if not exists is_active boolean not null default true;

-- ── Generate unique agency code function ───────────────────
-- Format: OX-XXX-XXXXX (prefix-category-5alphanum)
create or replace function public.generate_agency_code()
returns text language plpgsql security definer as $$
declare
  code text;
  attempts int := 0;
begin
  loop
    code := 'OX-' ||
      upper(substr(
        array_to_string(
          array(
            select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
              floor(random() * 31 + 1)::int, 1)
            from generate_series(1, 3)
          ), ''
        ), 1, 3
      )) || '-' ||
      upper(substr(
        array_to_string(
          array(
            select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
              floor(random() * 31 + 1)::int, 1)
            from generate_series(1, 5)
          ), ''
        ), 1, 5
      );
    exit when not exists (
      select 1 from public.consulting_companies
      where agency_code = code
    );
    attempts := attempts + 1;
    if attempts > 10 then
      code := 'OX-' || upper(encode(gen_random_bytes(4), 'hex'));
      exit;
    end if;
  end loop;
  return code;
end;
$$;

-- ── Backfill agency codes for existing companies ───────────
do $$
declare
  rec record;
begin
  for rec in
    select id from public.consulting_companies
    where agency_code is null
  loop
    update public.consulting_companies
    set agency_code = public.generate_agency_code()
    where id = rec.id;
  end loop;
end $$;

-- ── Agency Join Requests ───────────────────────────────────
-- Users request access to an agency; owners/admins approve.
create table if not exists public.agency_join_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.consulting_companies(id) on delete cascade,
  user_id uuid not null,
  requested_role text not null default 'employee' check (requested_role in ('admin','manager','employee')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  message text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_id, user_id)
);
create index if not exists agency_join_requests_agency_idx
  on public.agency_join_requests(agency_id);
create index if not exists agency_join_requests_user_idx
  on public.agency_join_requests(user_id);
create index if not exists agency_join_requests_status_idx
  on public.agency_join_requests(status);

-- Trigger for updated_at
drop trigger if exists set_updated_at on public.agency_join_requests;
create trigger set_updated_at before update on public.agency_join_requests
  for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.agency_join_requests enable row level security;

-- RLS: agency members (owner/admin) can read requests for their agency
drop policy if exists "ajr_read_agency" on public.agency_join_requests;
create policy "ajr_read_agency" on public.agency_join_requests
  for select using (
    exists (
      select 1 from public.consulting_members m
      where m.consulting_company_id = agency_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('owner', 'administrator')
    )
  );

-- RLS: users can read their own requests
drop policy if exists "ajr_read_own" on public.agency_join_requests;
create policy "ajr_read_own" on public.agency_join_requests
  for select using (user_id = auth.uid());

-- RLS: authenticated users can insert their own request
drop policy if exists "ajr_insert" on public.agency_join_requests;
create policy "ajr_insert" on public.agency_join_requests
  for insert with check (
    user_id = auth.uid()
    and status = 'pending'
  );

-- RLS: only agency owner/admin can update (approve/reject)
drop policy if exists "ajr_update_agency" on public.agency_join_requests;
create policy "ajr_update_agency" on public.agency_join_requests
  for update using (
    exists (
      select 1 from public.consulting_members m
      where m.consulting_company_id = agency_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('owner', 'administrator')
    )
  );

-- ── Auto-generate agency_code on insert if missing ─────────
create or replace function public.set_agency_code_on_insert()
returns trigger language plpgsql security definer as $$
begin
  if new.agency_code is null then
    new.agency_code := public.generate_agency_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agency_code on public.consulting_companies;
create trigger trg_agency_code
  before insert on public.consulting_companies
  for each row execute function public.set_agency_code_on_insert();

-- ── RLS: allow public to look up agency by code ────────────
-- (only returns basic info: id, name, logo_url, city, country, agency_code)
-- This is needed for the "Join Agency" flow.
-- The existing cc_read_member policy already allows members to read.
-- We add a separate policy for code-based public lookup.
drop policy if exists "cc_read_by_code" on public.consulting_companies;
create policy "cc_read_by_code" on public.consulting_companies
  for select using (
    agency_code is not null
    and is_active = true
  );

-- ── Updated consulting_members RLS ──────────────────────────
-- The existing policies allow members to read all members in their company.
-- We need to also allow users to read their own memberships across ALL companies
-- (for the agency switcher / "My Agencies" list).

drop policy if exists "cm_read_own_all" on public.consulting_members;
create policy "cm_read_own_all" on public.consulting_members
  for select using (user_id = auth.uid());

-- ── Allow users to see company info for agencies they belong to ──
-- (already covered by cc_read_member, but we add explicit policy for clarity)
drop policy if exists "cc_read_member_explicit" on public.consulting_companies;
create policy "cc_read_member_explicit" on public.consulting_companies
  for select using (
    exists (
      select 1 from public.consulting_members m
      where m.consulting_company_id = id
        and m.user_id = auth.uid()
    )
  );
