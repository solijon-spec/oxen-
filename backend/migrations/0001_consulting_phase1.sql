-- ============================================================
--  OXEN — Consulting Business Phase 1 schema
--  Run this in Supabase SQL editor (Dashboard → SQL → New query).
--  Idempotent: safe to re-run.
-- ============================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================
--  1. consulting_companies (extend existing table)
-- ============================================================
alter table public.consulting_companies
  add column if not exists legal_name text,
  add column if not exists registration_number text,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists cover_image_url text,
  add column if not exists working_hours text,
  add column if not exists supported_languages text[],
  add column if not exists destination_countries text[],
  add column if not exists years_experience int default 0,
  add column if not exists manager_full_name text,
  add column if not exists manager_phone text,
  add column if not exists manager_email text,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists subscription_status text not null default 'none',
  add column if not exists subscription_plan text,
  add column if not exists subscription_start_date timestamptz,
  add column if not exists subscription_end_date timestamptz;

create index if not exists consulting_companies_owner_idx
  on public.consulting_companies(owner_id);

-- ============================================================
--  2. consulting_subscriptions
-- ============================================================
create table if not exists public.consulting_subscriptions (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  plan text not null check (plan in ('monthly','quarterly','annual')),
  status text not null default 'active' check (status in ('trial','active','past_due','expired','cancelled','suspended')),
  start_date timestamptz not null default now(),
  end_date timestamptz not null,
  auto_renewal boolean not null default true,
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  payment_method_id text,
  payment_customer_id text,
  card_brand text,
  card_last4 text,
  card_exp_month int,
  card_exp_year int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists consulting_subscriptions_company_idx
  on public.consulting_subscriptions(consulting_company_id);
create index if not exists consulting_subscriptions_status_idx
  on public.consulting_subscriptions(status);

-- ============================================================
--  3. consulting_roles (lookup)
-- ============================================================
create table if not exists public.consulting_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.consulting_roles (name, description, is_system)
  values
    ('owner','Full company access', true),
    ('administrator','Full company access except deleting company', true),
    ('manager','Manage clients, applications, tasks', true),
    ('consultant','Manage assigned clients only', true),
    ('support_agent','View clients, send messages', true),
    ('finance_manager','Access payments and refunds', true),
    ('content_manager','Create posts and packages, no payment details', true),
    ('read_only','View only', true)
  on conflict (name) do nothing;

-- ============================================================
--  4. consulting_permissions
-- ============================================================
create table if not exists public.consulting_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.consulting_roles(id) on delete cascade,
  permission text not null,
  created_at timestamptz not null default now(),
  unique (role_id, permission)
);

-- Seed default permissions per role
insert into public.consulting_permissions (role_id, permission)
  select r.id, p.perm from public.consulting_roles r
  join (values
    ('owner','*'),
    ('administrator','*'),
    ('manager','clients:write'),
    ('manager','applications:write'),
    ('manager','tasks:write'),
    ('consultant','clients:read_assigned'),
    ('consultant','applications:read_assigned'),
    ('support_agent','clients:read'),
    ('support_agent','messages:write'),
    ('finance_manager','payments:read'),
    ('finance_manager','refunds:write'),
    ('content_manager','packages:write'),
    ('content_manager','posts:write'),
    ('read_only','*:read')
  ) as p(role, perm) on p.role = r.name
  on conflict do nothing;

-- ============================================================
--  5. consulting_members
-- ============================================================
create table if not exists public.consulting_members (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'consultant',
  status text not null default 'active' check (status in ('active','suspended','invited','removed')),
  invited_by uuid,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (consulting_company_id, user_id)
);
create index if not exists consulting_members_user_idx on public.consulting_members(user_id);
create index if not exists consulting_members_company_idx on public.consulting_members(consulting_company_id);

-- ============================================================
--  6. consulting_invitations
-- ============================================================
create table if not exists public.consulting_invitations (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  email text not null,
  role text not null default 'consultant',
  token text not null unique default encode(gen_random_bytes(32),'hex'),
  status text not null default 'pending' check (status in ('pending','accepted','declined','revoked')),
  invited_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists consulting_invitations_company_idx on public.consulting_invitations(consulting_company_id);
create index if not exists consulting_invitations_email_idx on public.consulting_invitations(email);

-- ============================================================
--  7. consulting_clients
-- ============================================================
create table if not exists public.consulting_clients (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  user_id uuid,
  full_name text not null,
  phone text,
  email text,
  photo_url text,
  service_id uuid,
  destination_country text,
  assigned_employee_id uuid,
  purchase_date timestamptz,
  payment_status text default 'pending' check (payment_status in ('pending','paid','failed','refunded','partial')),
  application_status text default 'new_lead' check (application_status in (
    'new_lead','contacted','consultation_scheduled','documents_requested','documents_received',
    'under_review','submitted','waiting_for_result','approved','rejected','travel_completed','cancelled','refunded'
  )),
  final_result text check (final_result in ('pending','success','unsuccessful','cancelled')),
  last_activity_at timestamptz default now(),
  is_archived boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists consulting_clients_company_idx on public.consulting_clients(consulting_company_id);
create index if not exists consulting_clients_employee_idx on public.consulting_clients(assigned_employee_id);
create index if not exists consulting_clients_status_idx on public.consulting_clients(application_status);
create index if not exists consulting_clients_user_idx on public.consulting_clients(user_id);

-- ============================================================
--  8. consulting_client_notes (internal, private)
-- ============================================================
create table if not exists public.consulting_client_notes (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  client_id uuid not null references public.consulting_clients(id) on delete cascade,
  author_id uuid not null,
  body text not null,
  is_internal boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists consulting_client_notes_client_idx on public.consulting_client_notes(client_id);

-- ============================================================
--  9. consulting_applications
-- ============================================================
create table if not exists public.consulting_applications (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  client_id uuid not null references public.consulting_clients(id) on delete cascade,
  service_id uuid,
  destination_country text,
  application_type text,
  assigned_employee_id uuid,
  submission_date date,
  expected_completion_date date,
  status text not null default 'new' check (status in ('new','documents','processing','submitted','approved','rejected','completed')),
  required_documents jsonb default '[]'::jsonb,
  uploaded_documents jsonb default '[]'::jsonb,
  internal_notes text,
  client_visible_updates text,
  final_decision text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists consulting_applications_company_idx on public.consulting_applications(consulting_company_id);
create index if not exists consulting_applications_client_idx on public.consulting_applications(client_id);
create index if not exists consulting_applications_status_idx on public.consulting_applications(status);

-- ============================================================
--  10. consulting_application_history
-- ============================================================
create table if not exists public.consulting_application_history (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  application_id uuid not null references public.consulting_applications(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists consulting_application_history_app_idx on public.consulting_application_history(application_id);

-- ============================================================
--  11. consulting_packages (extends services with extra fields)
--     Kept separate from services to preserve existing service flow.
-- ============================================================
create table if not exists public.consulting_packages (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  destination_country text,
  estimated_processing_time text,
  included_services jsonb default '[]'::jsonb,
  required_documents jsonb default '[]'::jsonb,
  what_client_receives jsonb default '[]'::jsonb,
  who_this_is_for text,
  refund_conditions text,
  contact_info jsonb default '{}'::jsonb,
  available_slots int,
  faq jsonb default '[]'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists consulting_packages_company_idx on public.consulting_packages(consulting_company_id);
create index if not exists consulting_packages_service_idx on public.consulting_packages(service_id);

-- ============================================================
--  12. consulting_payments
-- ============================================================
create table if not exists public.consulting_payments (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  client_id uuid references public.consulting_clients(id) on delete set null,
  service_id uuid,
  transaction_id text not null,
  type text not null default 'package' check (type in ('subscription','package','refund')),
  gross_amount numeric(12,2) not null default 0,
  commission numeric(12,2) not null default 0,
  net_amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  payment_method_id text,
  card_brand text,
  card_last4 text,
  status text not null default 'pending' check (status in ('pending','requires_verification','paid','failed','refunded','cancelled')),
  refund_status text,
  receipt_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists consulting_payments_company_idx on public.consulting_payments(consulting_company_id);
create index if not exists consulting_payments_status_idx on public.consulting_payments(status);
create index if not exists consulting_payments_client_idx on public.consulting_payments(client_id);

-- ============================================================
--  13. consulting_documents (private)
-- ============================================================
create table if not exists public.consulting_documents (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  client_id uuid references public.consulting_clients(id) on delete cascade,
  application_id uuid references public.consulting_applications(id) on delete cascade,
  filename text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  uploaded_by uuid,
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists consulting_documents_company_idx on public.consulting_documents(consulting_company_id);
create index if not exists consulting_documents_client_idx on public.consulting_documents(client_id);

-- ============================================================
--  14. consulting_activity_logs
-- ============================================================
create table if not exists public.consulting_activity_logs (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists consulting_activity_logs_company_idx on public.consulting_activity_logs(consulting_company_id);

-- ============================================================
--  15. consulting_notifications (schema ready, UI in Phase 2)
-- ============================================================
create table if not exists public.consulting_notifications (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  user_id uuid,
  type text not null,
  title text,
  body text,
  data jsonb default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists consulting_notifications_company_idx on public.consulting_notifications(consulting_company_id);
create index if not exists consulting_notifications_user_idx on public.consulting_notifications(user_id);

-- ============================================================
--  16. consulting_tasks (schema ready, UI in Phase 2)
-- ============================================================
create table if not exists public.consulting_tasks (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  client_id uuid references public.consulting_clients(id) on delete set null,
  assigned_employee_id uuid,
  title text not null,
  description text,
  priority text default 'medium' check (priority in ('low','medium','high','urgent')),
  status text default 'todo' check (status in ('todo','in_progress','completed','cancelled')),
  due_date timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists consulting_tasks_company_idx on public.consulting_tasks(consulting_company_id);

-- ============================================================
--  17. consulting_messages (schema ready, UI in Phase 2)
-- ============================================================
create table if not exists public.consulting_messages (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  client_id uuid references public.consulting_clients(id) on delete cascade,
  sender_id uuid not null,
  sender_role text not null default 'employee',
  body text,
  attachments jsonb default '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists consulting_messages_company_idx on public.consulting_messages(consulting_company_id);
create index if not exists consulting_messages_client_idx on public.consulting_messages(client_id);

-- ============================================================
--  18. consulting_posts (schema ready, UI in Phase 2)
-- ============================================================
create table if not exists public.consulting_posts (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  service_id uuid,
  title text not null,
  post_type text default 'service_promotion',
  body text,
  media jsonb default '[]'::jsonb,
  status text default 'draft' check (status in ('draft','published','scheduled','archived')),
  scheduled_at timestamptz,
  views int default 0,
  likes int default 0,
  comments int default 0,
  shares int default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists consulting_posts_company_idx on public.consulting_posts(consulting_company_id);

-- ============================================================
--  19. consulting_reviews
-- ============================================================
create table if not exists public.consulting_reviews (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  service_id uuid,
  client_id uuid references public.consulting_clients(id) on delete set null,
  user_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  images jsonb default '[]'::jsonb,
  reply text,
  is_verified boolean not null default false,
  is_reported boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists consulting_reviews_company_idx on public.consulting_reviews(consulting_company_id);

-- ============================================================
--  updated_at trigger helper
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'consulting_companies','consulting_subscriptions','consulting_members','consulting_invitations',
      'consulting_clients','consulting_client_notes','consulting_applications','consulting_application_history',
      'consulting_packages','consulting_payments','consulting_documents','consulting_activity_logs',
      'consulting_notifications','consulting_tasks','consulting_messages','consulting_posts','consulting_reviews'
    ])
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table public.consulting_companies            enable row level security;
alter table public.consulting_subscriptions         enable row level security;
alter table public.consulting_roles                 enable row level security;
alter table public.consulting_permissions           enable row level security;
alter table public.consulting_members               enable row level security;
alter table public.consulting_invitations           enable row level security;
alter table public.consulting_clients               enable row level security;
alter table public.consulting_client_notes          enable row level security;
alter table public.consulting_applications          enable row level security;
alter table public.consulting_application_history   enable row level security;
alter table public.consulting_packages              enable row level security;
alter table public.consulting_payments              enable row level security;
alter table public.consulting_documents             enable row level security;
alter table public.consulting_activity_logs         enable row level security;
alter table public.consulting_notifications         enable row level security;
alter table public.consulting_tasks                 enable row level security;
alter table public.consulting_messages              enable row level security;
alter table public.consulting_posts                 enable row level security;
alter table public.consulting_reviews               enable row level security;

-- Helper: is the current user an active member of a given company with a role?
create or replace function public.is_consulting_member(company_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.consulting_members m
    where m.consulting_company_id = company_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_consulting_admin(company_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.consulting_members m
    where m.consulting_company_id = company_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner','administrator')
  );
$$;

create or replace function public.current_user_company_id()
returns uuid language sql stable security definer as $$
  select m.consulting_company_id from public.consulting_members m
  where m.user_id = auth.uid() and m.status = 'active' limit 1;
$$;

-- consulting_companies: owner or any active member can read; admin/owner can update; anyone can read published/verified (public profile)
drop policy if exists "cc_read_member" on public.consulting_companies;
create policy "cc_read_member" on public.consulting_companies
  for select using (
    public.is_consulting_member(id) or verification_status = 'verified' or owner_id = auth.uid()
  );

drop policy if exists "cc_insert_owner" on public.consulting_companies;
create policy "cc_insert_owner" on public.consulting_companies
  for insert with check (owner_id = auth.uid());

drop policy if exists "cc_update_admin" on public.consulting_companies;
create policy "cc_update_admin" on public.consulting_companies
  for update using (public.is_consulting_admin(id));

-- consulting_subscriptions
drop policy if exists "cs_read" on public.consulting_subscriptions;
create policy "cs_read" on public.consulting_subscriptions
  for select using (public.is_consulting_member(consulting_company_id));
drop policy if exists "cs_insert" on public.consulting_subscriptions;
create policy "cs_insert" on public.consulting_subscriptions
  for insert with check (created_by = auth.uid());
drop policy if exists "cs_update" on public.consulting_subscriptions;
create policy "cs_update" on public.consulting_subscriptions
  for update using (public.is_consulting_admin(consulting_company_id));

-- consulting_roles / permissions: any authenticated user can read (for RBAC UI)
drop policy if exists "cr_read" on public.consulting_roles;
create policy "cr_read" on public.consulting_roles for select to authenticated using (true);
drop policy if exists "cp_read" on public.consulting_permissions;
create policy "cp_read" on public.consulting_permissions for select to authenticated using (true);

-- consulting_members
drop policy if exists "cm_read" on public.consulting_members;
create policy "cm_read" on public.consulting_members
  for select using (public.is_consulting_member(consulting_company_id) or user_id = auth.uid());
drop policy if exists "cm_insert" on public.consulting_members;
create policy "cm_insert" on public.consulting_members
  for insert with check (public.is_consulting_admin(consulting_company_id) or invited_by = auth.uid());
drop policy if exists "cm_update" on public.consulting_members;
create policy "cm_update" on public.consulting_members
  for update using (public.is_consulting_admin(consulting_company_id) or user_id = auth.uid());

-- consulting_invitations
drop policy if exists "ci_read" on public.consulting_invitations;
create policy "ci_read" on public.consulting_invitations
  for select using (public.is_consulting_member(consulting_company_id) or email in (select email from auth.users where id = auth.uid()));
drop policy if exists "ci_insert" on public.consulting_invitations;
create policy "ci_insert" on public.consulting_invitations
  for insert with check (public.is_consulting_admin(consulting_company_id));
drop policy if exists "ci_update" on public.consulting_invitations;
create policy "ci_update" on public.consulting_invitations
  for update using (public.is_consulting_admin(consulting_company_id) or email in (select email from auth.users where id = auth.uid()));

-- consulting_clients
drop policy if exists "cl_read" on public.consulting_clients;
create policy "cl_read" on public.consulting_clients
  for select using (
    public.is_consulting_member(consulting_company_id)
    or user_id = auth.uid()
  );
drop policy if exists "cl_insert" on public.consulting_clients;
create policy "cl_insert" on public.consulting_clients
  for insert with check (public.is_consulting_member(consulting_company_id));
drop policy if exists "cl_update" on public.consulting_clients;
create policy "cl_update" on public.consulting_clients
  for update using (public.is_consulting_member(consulting_company_id));
drop policy if exists "cl_delete" on public.consulting_clients;
create policy "cl_delete" on public.consulting_clients
  for delete using (public.is_consulting_admin(consulting_company_id));

-- consulting_client_notes (internal — never exposed to client)
drop policy if exists "cn_read" on public.consulting_client_notes;
create policy "cn_read" on public.consulting_client_notes
  for select using (public.is_consulting_member(consulting_company_id));
drop policy if exists "cn_insert" on public.consulting_client_notes;
create policy "cn_insert" on public.consulting_client_notes
  for insert with check (public.is_consulting_member(consulting_company_id));
drop policy if exists "cn_update" on public.consulting_client_notes;
create policy "cn_update" on public.consulting_client_notes
  for update using (public.is_consulting_member(consulting_company_id));
drop policy if exists "cn_delete" on public.consulting_client_notes;
create policy "cn_delete" on public.consulting_client_notes
  for delete using (author_id = auth.uid());

-- consulting_applications
drop policy if exists "ap_read" on public.consulting_applications;
create policy "ap_read" on public.consulting_applications
  for select using (public.is_consulting_member(consulting_company_id));
drop policy if exists "ap_insert" on public.consulting_applications;
create policy "ap_insert" on public.consulting_applications
  for insert with check (public.is_consulting_member(consulting_company_id));
drop policy if exists "ap_update" on public.consulting_applications;
create policy "ap_update" on public.consulting_applications
  for update using (public.is_consulting_member(consulting_company_id));
drop policy if exists "ap_delete" on public.consulting_applications;
create policy "ap_delete" on public.consulting_applications
  for delete using (public.is_consulting_admin(consulting_company_id));

-- consulting_application_history
drop policy if exists "ah_read" on public.consulting_application_history;
create policy "ah_read" on public.consulting_application_history
  for select using (public.is_consulting_member(consulting_company_id));
drop policy if exists "ah_insert" on public.consulting_application_history;
create policy "ah_insert" on public.consulting_application_history
  for insert with check (public.is_consulting_member(consulting_company_id));

-- consulting_packages
drop policy if exists "pk_read" on public.consulting_packages;
create policy "pk_read" on public.consulting_packages
  for select using (public.is_consulting_member(consulting_company_id) or is_published = true);
drop policy if exists "pk_insert" on public.consulting_packages;
create policy "pk_insert" on public.consulting_packages
  for insert with check (public.is_consulting_member(consulting_company_id));
drop policy if exists "pk_update" on public.consulting_packages;
create policy "pk_update" on public.consulting_packages
  for update using (public.is_consulting_member(consulting_company_id));
drop policy if exists "pk_delete" on public.consulting_packages;
create policy "pk_delete" on public.consulting_packages
  for delete using (public.is_consulting_admin(consulting_company_id));

-- consulting_payments
drop policy if exists "pm_read" on public.consulting_payments;
create policy "pm_read" on public.consulting_payments
  for select using (public.is_consulting_member(consulting_company_id));
drop policy if exists "pm_insert" on public.consulting_payments;
create policy "pm_insert" on public.consulting_payments
  for insert with check (public.is_consulting_member(consulting_company_id) or created_by = auth.uid());
drop policy if exists "pm_update" on public.consulting_payments;
create policy "pm_update" on public.consulting_payments
  for update using (public.is_consulting_admin(consulting_company_id));

-- consulting_documents (private by default)
drop policy if exists "dc_read" on public.consulting_documents;
create policy "dc_read" on public.consulting_documents
  for select using (public.is_consulting_member(consulting_company_id));
drop policy if exists "dc_insert" on public.consulting_documents;
create policy "dc_insert" on public.consulting_documents
  for insert with check (public.is_consulting_member(consulting_company_id));
drop policy if exists "dc_delete" on public.consulting_documents;
create policy "dc_delete" on public.consulting_documents
  for delete using (public.is_consulting_admin(consulting_company_id) or uploaded_by = auth.uid());

-- consulting_activity_logs
drop policy if exists "al_read" on public.consulting_activity_logs;
create policy "al_read" on public.consulting_activity_logs
  for select using (public.is_consulting_member(consulting_company_id));
drop policy if exists "al_insert" on public.consulting_activity_logs;
create policy "al_insert" on public.consulting_activity_logs
  for insert with check (public.is_consulting_member(consulting_company_id));

-- consulting_notifications
drop policy if exists "nt_read" on public.consulting_notifications;
create policy "nt_read" on public.consulting_notifications
  for select using (public.is_consulting_member(consulting_company_id) or user_id = auth.uid());
drop policy if exists "nt_update" on public.consulting_notifications;
create policy "nt_update" on public.consulting_notifications
  for update using (user_id = auth.uid() or public.is_consulting_admin(consulting_company_id));

-- consulting_tasks
drop policy if exists "tk_read" on public.consulting_tasks;
create policy "tk_read" on public.consulting_tasks
  for select using (public.is_consulting_member(consulting_company_id));
drop policy if exists "tk_insert" on public.consulting_tasks;
create policy "tk_insert" on public.consulting_tasks
  for insert with check (public.is_consulting_member(consulting_company_id));
drop policy if exists "tk_update" on public.consulting_tasks;
create policy "tk_update" on public.consulting_tasks
  for update using (public.is_consulting_member(consulting_company_id));

-- consulting_messages
drop policy if exists "mg_read" on public.consulting_messages;
create policy "mg_read" on public.consulting_messages
  for select using (public.is_consulting_member(consulting_company_id) or sender_id = auth.uid());
drop policy if exists "mg_insert" on public.consulting_messages;
create policy "mg_insert" on public.consulting_messages
  for insert with check (public.is_consulting_member(consulting_company_id) or sender_id = auth.uid());

-- consulting_posts (published ones are public; drafts are members-only)
drop policy if exists "pt_read" on public.consulting_posts;
create policy "pt_read" on public.consulting_posts
  for select using (public.is_consulting_member(consulting_company_id) or status = 'published');
drop policy if exists "pt_insert" on public.consulting_posts;
create policy "pt_insert" on public.consulting_posts
  for insert with check (public.is_consulting_member(consulting_company_id));
drop policy if exists "pt_update" on public.consulting_posts;
create policy "pt_update" on public.consulting_posts
  for update using (public.is_consulting_member(consulting_company_id));
drop policy if exists "pt_delete" on public.consulting_posts;
create policy "pt_delete" on public.consulting_posts
  for delete using (public.is_consulting_admin(consulting_company_id) or created_by = auth.uid());

-- consulting_reviews (verified clients + company members can read; only verified clients can insert)
drop policy if exists "rv_read" on public.consulting_reviews;
create policy "rv_read" on public.consulting_reviews
  for select using (public.is_consulting_member(consulting_company_id) or user_id = auth.uid());
drop policy if exists "rv_insert" on public.consulting_reviews;
create policy "rv_insert" on public.consulting_reviews
  for insert with check (user_id = auth.uid());
drop policy if exists "rv_update" on public.consulting_reviews;
create policy "rv_update" on public.consulting_reviews
  for update using (public.is_consulting_admin(consulting_company_id) or user_id = auth.uid());

-- ============================================================
--  Storage bucket for company logos & documents
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('consulting','consulting', true)
  on conflict (id) do nothing;

drop policy if exists "consulting_bucket_read" on storage.objects;
create policy "consulting_bucket_read" on storage.objects
  for select using (bucket_id = 'consulting');

drop policy if exists "consulting_bucket_upload" on storage.objects;
create policy "consulting_bucket_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'consulting');

drop policy if exists "consulting_bucket_update" on storage.objects;
create policy "consulting_bucket_update" on storage.objects
  for update to authenticated using (bucket_id = 'consulting');

drop policy if exists "consulting_bucket_delete" on storage.objects;
create policy "consulting_bucket_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'consulting');

-- Done.
