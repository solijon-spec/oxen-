-- ============================================================
--  OXEN — Owner Notifications + Audit Log Enhancement
--  Adds private owner notifications for the two platform owners.
--  Enhances audit log with previous_value, new_value, reason.
--  Idempotent: safe to re-run.
--
--  IMPORTANT:
--  - Does NOT touch existing tables' data.
--  - Does NOT disable existing RLS.
--  - Only the two seeded owner accounts can read notifications.
-- ============================================================

-- ============================================================
--  1. owner_notifications — private notifications for owners
-- ============================================================
create table if not exists public.owner_notifications (
  id                   uuid primary key default gen_random_uuid(),
  -- Event type: one of the spec'd notification categories
  event_type           text not null check (event_type in (
    'payment_submitted',
    'premium_application',
    'payment_confirmation_required',
    'subscription_expiring_7',
    'subscription_expiring_30',
    'subscription_expired',
    'payment_rejected',
    'refund_request',
    'suspicious_activity',
    'pending_email_registered'
  )),
  -- Related entities (nullable since not all events have all)
  consulting_company_id uuid,
  consulting_company_name text,
  user_id              uuid,
  user_name            text,
  user_email           text,
  subscription_id      uuid,
  payment_request_id   uuid,
  -- Optional metadata for the "View details" link
  metadata             jsonb default '{}'::jsonb,
  -- Read tracking
  is_read              boolean not null default false,
  read_at              timestamptz,
  read_by              uuid,
  -- Priority (higher = more urgent)
  priority             int not null default 0,
  -- Timestamps
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists owner_notif_unread_idx
  on public.owner_notifications(is_read, created_at desc);
create index if not exists owner_notif_event_idx
  on public.owner_notifications(event_type);
create index if not exists owner_notif_company_idx
  on public.owner_notifications(consulting_company_id);

alter table public.owner_notifications enable row level security;

-- Only owners can read/manage notifications
drop policy if exists "on_owner_all" on public.owner_notifications;
create policy "on_owner_all" on public.owner_notifications
  for all using (public.is_owner()) with check (public.is_owner());

-- updated_at trigger
drop trigger if exists owner_notifications_touch on public.owner_notifications;
create trigger owner_notifications_touch before update on public.owner_notifications
  for each row execute function public.touch_updated_at();

-- ============================================================
--  2. Enhance owner_audit_logs — add previous_value, new_value,
--     reason, and IP/device (safely, only if obtainable)
-- ============================================================
alter table public.owner_audit_logs
  add column if not exists previous_value jsonb,
  add column if not exists new_value jsonb,
  add column if not exists reason text,
  add column if not exists target_user_id uuid,
  add column if not exists target_company_id uuid,
  add column if not exists target_label text,
  add column if not exists client_ip text,
  add column if not exists user_agent text;

-- Audit log is append-only: prevent UPDATE and DELETE via RLS.
-- We do this by only allowing INSERT (select + insert policies already
-- exist from 0005; we explicitly drop update/delete policies if any).
drop policy if exists "oal_owner_update" on public.owner_audit_logs;
drop policy if exists "oal_owner_delete" on public.owner_audit_logs;

-- Ensure select + insert remain (from 0005, re-stated for safety)
drop policy if exists "oal_owner_select" on public.owner_audit_logs;
create policy "oal_owner_select" on public.owner_audit_logs
  for select using (public.is_owner());

drop policy if exists "oal_owner_insert" on public.owner_audit_logs;
create policy "oal_owner_insert" on public.owner_audit_logs
  for insert with check (public.is_owner());

-- Remove the broad "for all" policy from 0005 (we now use specific policies)
-- This is safe — the new policies are narrower.
drop policy if exists "oal_owner_all" on public.owner_audit_logs;

-- Index for filtering by target
create index if not exists owner_audit_target_user_idx
  on public.owner_audit_logs(target_user_id);
create index if not exists owner_audit_target_company_idx
  on public.owner_audit_logs(target_company_id);
create index if not exists owner_audit_action_idx
  on public.owner_audit_logs(action);

-- ============================================================
--  3. Add owner_notifications count function (for unread badge)
-- ============================================================
create or replace function public.owner_unread_notification_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.owner_notifications
  where is_read = false;
$$;

-- ============================================================
--  4. Prevent owners from removing their own owner_admins row
--     (delete protection — two-owner safety)
--     We drop any delete policy and create none, so RLS blocks
--     all deletes on owner_admins. Inserts are also blocked
--     (only seeded rows should exist).
-- ============================================================
drop policy if exists "oa_delete_own" on public.owner_admins;
drop policy if exists "oa_delete_any" on public.owner_admins;

-- Done. No existing data modified, no RLS disabled.
