-- ============================================================
-- 0015 — Tour Agency CRM Applications
--
-- Creates the `agency_applications` table where tour agencies
-- submit their CRM access application. The OXEN Owner reviews
-- and approves/rejects in the Owner Admin Panel.
--
-- Statuses: draft, submitted, under_review, more_info_required,
--           approved, rejected
--
-- CRM access is granted ONLY when status = 'approved'.
-- No auto-approval. No payment before approval.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ── Enum for application status ──
do $$
begin
  if not exists (select 1 from pg_type where typname = 'agency_application_status') then
    create type agency_application_status as enum (
      'draft',
      'submitted',
      'under_review',
      'more_info_required',
      'approved',
      'rejected'
    );
  end if;
end $$;

-- ── Table ──
create table if not exists public.agency_applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,

  -- Agency information
  agency_name       text not null,
  legal_name        text,
  manager_name      text,
  country           text,
  city              text,
  address           text,
  phone             text,
  email             text,
  website           text,
  logo_url          text,

  -- Social links (stored as JSONB for flexibility)
  social_links      jsonb default '{}'::jsonb,

  -- License information
  license_number       text,
  license_issuing_org  text,
  license_issue_date   date,
  license_expiry_date  date,

  -- Documents (private Supabase Storage URLs — not public)
  license_document_url       text,
  registration_document_url  text,
  additional_documents       jsonb default '[]'::jsonb,  -- array of {url, name, type}
  agency_photos              jsonb default '[]'::jsonb,  -- array of {url, name}

  -- Review
  status              agency_application_status not null default 'draft',
  admin_note          text,
  rejection_reason    text,
  owner_request_message text,

  -- Timestamps
  submitted_at        timestamptz,
  reviewed_at         timestamptz,
  reviewed_by         uuid references auth.users(id),
  admin_notification_sent_at timestamptz,  -- duplicate email protection

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── Indexes ──
create index if not exists idx_agency_applications_user_id
  on public.agency_applications(user_id);

create index if not exists idx_agency_applications_status
  on public.agency_applications(status);

create index if not exists idx_agency_applications_created_at
  on public.agency_applications(created_at desc);

-- ── updated_at trigger ──
create or replace function public.touch_agency_app_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_agency_app_updated_at on public.agency_applications;
create trigger trg_agency_app_updated_at
  before update on public.agency_applications
  for each row execute function public.touch_agency_app_updated_at();

-- ── RLS ──
alter table public.agency_applications enable row level security;

-- Users can read only their own applications
drop policy if exists "agency_applications_select_own" on public.agency_applications;
create policy "agency_applications_select_own"
  on public.agency_applications
  for select
  to authenticated
  using (user_id = auth.uid());

-- Users can insert their own applications
drop policy if exists "agency_applications_insert_own" on public.agency_applications;
create policy "agency_applications_insert_own"
  on public.agency_applications
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users can update their own applications (but not status fields — those are owner-controlled)
drop policy if exists "agency_applications_update_own" on public.agency_applications;
create policy "agency_applications_update_own"
  on public.agency_applications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── Owner/Admin: full access to all applications ──
-- Uses the existing is_owner() function from migration 0005
drop policy if exists "agency_applications_owner_all" on public.agency_applications;
create policy "agency_applications_owner_all"
  on public.agency_applications
  for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ── Helper: check if a user has an approved agency application ──
create or replace function public.has_approved_agency_application(p_user_id uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.agency_applications
    where user_id = p_user_id
    and status = 'approved'
  );
$$;

-- Grant execute to authenticated
grant execute on function public.has_approved_agency_application(uuid) to authenticated;

-- ── Activity log trigger (optional — if consulting_activity_logs exists) ──
-- Records status changes for audit trail
create or replace function public.log_agency_application_status_change()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only log when status changes
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    -- Insert into owner_audit_log if it exists
    if exists (select 1 from information_schema.tables where table_name = 'owner_audit_log' and table_schema = 'public') then
      insert into public.owner_audit_log (action, entity_type, entity_id, metadata, created_by)
      values (
        'agency_application_status_change',
        'agency_application',
        new.id,
        jsonb_build_object(
          'previous_status', old.status,
          'new_status', new.status,
          'agency_name', new.agency_name,
          'reviewed_by', new.reviewed_by,
          'rejection_reason', new.rejection_reason,
          'admin_note', new.admin_note
        ),
        coalesce(new.reviewed_by, auth.uid())
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agency_app_status_change on public.agency_applications;
create trigger trg_agency_app_status_change
  after update on public.agency_applications
  for each row execute function public.log_agency_application_status_change();

-- ── Grant permissions ──
grant select, insert, update on public.agency_applications to authenticated;
grant usage, select on all sequences in public.agency_applications to authenticated;
