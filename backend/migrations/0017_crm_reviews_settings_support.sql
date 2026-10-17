-- ============================================================
--  0017 — CRM Reviews enhancements, Agency Settings,
--         Support Tickets + Messages, Notification inserts
--
--  Reuses existing tables from migration 0001:
--    consulting_reviews, consulting_notifications,
--    consulting_subscriptions, consulting_companies
--
--  New tables:
--    consulting_support_tickets
--    consulting_support_ticket_messages
--    consulting_settings
--
--  RUN THIS MIGRATION IN SUPABASE SQL EDITOR.
-- ============================================================

-- ============================================================
--  1. consulting_reviews — add reply_at + report_reason
-- ============================================================
alter table public.consulting_reviews
  add column if not exists reply_at timestamptz,
  add column if not exists report_reason text,
  add column if not exists post_id uuid references public.consulting_posts(id) on delete set null;

-- Index for sorting reviews by company + date
create index if not exists consulting_reviews_company_created_idx
  on public.consulting_reviews(consulting_company_id, created_at desc);

-- Update RLS: allow company admins to update reply + reply_at (but NOT rating/comment)
drop policy if exists "rv_update" on public.consulting_reviews;
create policy "rv_update" on public.consulting_reviews
  for update using (
    public.is_consulting_admin(consulting_company_id) or user_id = auth.uid()
  );

-- ============================================================
--  2. consulting_support_tickets
-- ============================================================
create table if not exists public.consulting_support_tickets (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  user_id uuid not null,                        -- auth.uid() of the submitter
  agency_name text,                             -- snapshot of agency name at submission
  subject text not null,
  category text not null check (category in (
    'technical', 'crm', 'account', 'tour_package', 'billing', 'other'
  )),
  message text not null,
  attachment_url text,
  status text not null default 'open' check (status in (
    'open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'
  )),
  priority text default 'normal' check (priority in ('low','normal','high','urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_company_idx
  on public.consulting_support_tickets(consulting_company_id);
create index if not exists support_tickets_user_idx
  on public.consulting_support_tickets(user_id);
create index if not exists support_tickets_status_idx
  on public.consulting_support_tickets(status);

-- ============================================================
--  3. consulting_support_ticket_messages (chat within a ticket)
-- ============================================================
create table if not exists public.consulting_support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.consulting_support_tickets(id) on delete cascade,
  sender_id uuid not null,                      -- auth.uid() of sender
  sender_role text not null default 'user' check (sender_role in ('user','support')),
  body text not null,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_idx
  on public.consulting_support_ticket_messages(ticket_id, created_at);

-- ============================================================
--  4. consulting_settings (per-agency CRM settings)
-- ============================================================
create table if not exists public.consulting_settings (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null unique references public.consulting_companies(id) on delete cascade,
  -- GENERAL
  crm_language text default 'en',
  currency text default 'USD',
  timezone text default 'UTC',
  -- NOTIFICATIONS
  notify_new_client boolean default true,
  notify_new_application boolean default true,
  notify_tour_inquiry boolean default true,
  notify_review boolean default true,
  notify_employee_activity boolean default true,
  -- CRM PREFERENCES
  default_dashboard_period text default 'month' check (default_dashboard_period in ('today','week','month','3months','year')),
  default_currency text default 'USD',
  date_format text default 'MMM D, YYYY' check (date_format in ('MMM D, YYYY','DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD')),
  -- AGENCY PREFERENCES (jsonb for future extensibility)
  agency_preferences jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consulting_settings_company_idx
  on public.consulting_settings(consulting_company_id);

-- ============================================================
--  5. RLS for new tables
-- ============================================================

-- consulting_support_tickets
alter table public.consulting_support_tickets enable row level security;

drop policy if exists "st_read" on public.consulting_support_tickets;
create policy "st_read" on public.consulting_support_tickets
  for select using (
    public.is_consulting_member(consulting_company_id) or user_id = auth.uid()
  );

drop policy if exists "st_insert" on public.consulting_support_tickets;
create policy "st_insert" on public.consulting_support_tickets
  for insert with check (
    public.is_consulting_member(consulting_company_id) or user_id = auth.uid()
  );

drop policy if exists "st_update" on public.consulting_support_tickets;
create policy "st_update" on public.consulting_support_tickets
  for update using (
    public.is_consulting_member(consulting_company_id) or user_id = auth.uid()
  );

-- consulting_support_ticket_messages
alter table public.consulting_support_ticket_messages enable row level security;

drop policy if exists "stm_read" on public.consulting_support_ticket_messages;
create policy "stm_read" on public.consulting_support_ticket_messages
  for select using (
    exists (
      select 1 from public.consulting_support_tickets t
      where t.id = ticket_id
        and (public.is_consulting_member(t.consulting_company_id) or t.user_id = auth.uid())
    )
  );

drop policy if exists "stm_insert" on public.consulting_support_ticket_messages;
create policy "stm_insert" on public.consulting_support_ticket_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.consulting_support_tickets t
      where t.id = ticket_id
        and (public.is_consulting_member(t.consulting_company_id) or t.user_id = auth.uid())
    )
  );

-- consulting_settings
alter table public.consulting_settings enable row level security;

drop policy if exists "cs_settings_read" on public.consulting_settings;
create policy "cs_settings_read" on public.consulting_settings
  for select using (public.is_consulting_member(consulting_company_id));

drop policy if exists "cs_settings_upsert" on public.consulting_settings;
create policy "cs_settings_upsert" on public.consulting_settings
  for insert with check (public.is_consulting_admin(consulting_company_id));

drop policy if exists "cs_settings_update" on public.consulting_settings;
create policy "cs_settings_update" on public.consulting_settings
  for update using (public.is_consulting_admin(consulting_company_id));

-- ============================================================
--  6. updated_at triggers for new tables
-- ============================================================
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'consulting_support_tickets','consulting_support_ticket_messages','consulting_settings'
    ])
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ============================================================
--  7. Helper: auto-insert default settings row when a company
--     is created (optional convenience trigger)
-- ============================================================
create or replace function public.ensure_consulting_settings()
returns trigger language plpgsql security definer as $$
begin
  insert into public.consulting_settings (consulting_company_id)
  values (new.id)
  on conflict (consulting_company_id) do nothing;
  return new;
end;
$$;

drop trigger if exists ensure_settings_on_company_create
  on public.consulting_companies;
create trigger ensure_settings_on_company_create
  after insert on public.consulting_companies
  for each row execute function public.ensure_consulting_settings();

-- ============================================================
--  8. Function to insert a notification (callable from RLS)
-- ============================================================
create or replace function public.insert_consulting_notification(
  p_company_id uuid,
  p_user_id uuid default null,
  p_type text default null,
  p_title text default null,
  p_body text default null,
  p_data jsonb default '{}'::jsonb
)
returns void language sql security definer as $$
  insert into public.consulting_notifications
    (consulting_company_id, user_id, type, title, body, data)
  values (p_company_id, p_user_id, p_type, p_title, p_body, p_data);
$$;

-- Done.
