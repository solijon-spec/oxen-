-- ============================================================
--  OXEN — POS + Cashier schema (Phase 6)
--  Safe, idempotent migration. Does NOT replace or rename any
--  existing tables. Does NOT reset or delete existing data.
--  RLS enforced on every table — one consulting company can
--  never see another company's financial records.
--
--  Tables created:
--    consulting_pos_sales         — package sales to clients
--    consulting_pos_payments      — client payments (append-only)
--    consulting_cashier_accounts  — financial accounts/sources
--    consulting_cashier_txns      — income/expense/transfer rows
--    consulting_cashier_categories— per-company category lists
--    consulting_cashier_settings  — opening balance + currency
--    consulting_receipts          — generated payment receipts
--    consulting_payment_schedules — scheduled payment reminders
--    consulting_audit_logs        — audit trail for financial actions
--
--  Run in Supabase SQL editor. Idempotent — safe to re-run.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
--  1. consulting_pos_sales
-- ============================================================
create table if not exists public.consulting_pos_sales (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  package_id uuid references public.services(id) on delete set null,
  -- Denormalized package snapshot
  package_title text not null,
  package_image text,
  package_category text,
  destination_country text,
  duration text,
  -- Client personal info
  first_name text not null,
  last_name text not null,
  phone text not null,
  additional_phone text,
  email text,
  passport_number text,
  date_of_birth date,
  gender text,
  citizenship text,
  current_city text,
  address text,
  -- Sale info
  travel_or_program_date date,
  package_full_price numeric(14,2) not null default 0,
  currency text not null default 'USD',
  discount_amount numeric(14,2) not null default 0,
  final_price numeric(14,2) not null default 0,
  assigned_employee_id uuid,
  assigned_employee_name text,
  contract_number text,
  application_date date,
  notes text,
  -- Document checklist
  doc_passport_received boolean not null default false,
  doc_photo_received boolean not null default false,
  doc_application_form_received boolean not null default false,
  doc_diploma_received boolean not null default false,
  doc_translation_received boolean not null default false,
  doc_other text,
  doc_missing_notes text,
  -- Payment tracker (derived, cached for filtering)
  total_paid numeric(14,2) not null default 0,
  remaining_amount numeric(14,2) not null default 0,
  payment_percentage numeric(5,2) not null default 0,
  next_payment_date date,
  payment_method text,
  payment_status text not null default 'not_paid',
  sale_status text not null default 'not_paid',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists pos_sales_company_idx on public.consulting_pos_sales(consulting_company_id);
create index if not exists pos_sales_package_idx on public.consulting_pos_sales(package_id);
create index if not exists pos_sales_status_idx on public.consulting_pos_sales(sale_status);
create index if not exists pos_sales_employee_idx on public.consulting_pos_sales(assigned_employee_id);

-- ============================================================
--  2. consulting_pos_payments (append-only — never updated/deleted)
-- ============================================================
create table if not exists public.consulting_pos_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.consulting_pos_sales(id) on delete cascade,
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  payment_date date not null,
  method text not null,
  transaction_reference text,
  received_by uuid,
  received_by_name text,
  comment text,
  receipt_url text,
  is_reversed boolean not null default false,
  reversal_reason text,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists pos_payments_sale_idx on public.consulting_pos_payments(sale_id);
create index if not exists pos_payments_company_idx on public.consulting_pos_payments(consulting_company_id);

-- ============================================================
--  3. consulting_cashier_accounts
-- ============================================================
create table if not exists public.consulting_cashier_accounts (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  name text not null,
  kind text not null default 'other',
  currency text not null default 'USD',
  opening_balance numeric(14,2) not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

create index if not exists cashier_accounts_company_idx on public.consulting_cashier_accounts(consulting_company_id);

-- ============================================================
--  4. consulting_cashier_txns (income/expense/transfer)
-- ============================================================
create table if not exists public.consulting_cashier_txns (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  type text not null, -- income | expense | transfer
  category text not null,
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  date timestamptz not null default now(),
  method text,
  description text,
  related_sale_id uuid references public.consulting_pos_sales(id) on delete set null,
  related_client_name text,
  related_package_title text,
  responsible_employee_id uuid,
  responsible_employee_name text,
  receipt_url text,
  transaction_reference text,
  source_pos_payment_id uuid references public.consulting_pos_payments(id) on delete set null,
  account_id uuid references public.consulting_cashier_accounts(id) on delete set null,
  transfer_to_account_id uuid references public.consulting_cashier_accounts(id) on delete set null,
  is_reversed boolean not null default false,
  reversal_reason text,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  created_by_name text
);

create index if not exists cashier_txns_company_idx on public.consulting_cashier_txns(consulting_company_id);
create index if not exists cashier_txns_type_idx on public.consulting_cashier_txns(type);
create index if not exists cashier_txns_account_idx on public.consulting_cashier_txns(account_id);
create index if not exists cashier_txns_date_idx on public.consulting_cashier_txns(date);

-- ============================================================
--  5. consulting_cashier_categories (per-company custom + defaults)
-- ============================================================
create table if not exists public.consulting_cashier_categories (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  kind text not null, -- income | expense
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique(consulting_company_id, kind, name)
);

create index if not exists cashier_categories_company_idx on public.consulting_cashier_categories(consulting_company_id);

-- ============================================================
--  6. consulting_cashier_settings
-- ============================================================
create table if not exists public.consulting_cashier_settings (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null unique references public.consulting_companies(id) on delete cascade,
  opening_balance numeric(14,2) not null default 0,
  currency text not null default 'USD',
  updated_at timestamptz not null default now()
);

-- ============================================================
--  7. consulting_receipts
-- ============================================================
create table if not exists public.consulting_receipts (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  receipt_number text not null,
  sale_id uuid references public.consulting_pos_sales(id) on delete set null,
  payment_id uuid references public.consulting_pos_payments(id) on delete set null,
  client_name text not null,
  package_name text,
  package_full_price numeric(14,2),
  current_payment_amount numeric(14,2) not null,
  total_paid numeric(14,2) not null,
  remaining_amount numeric(14,2) not null,
  payment_percentage numeric(5,2) not null default 0,
  payment_date date not null,
  payment_method text,
  received_by_name text,
  currency text not null default 'USD',
  html_content text,
  created_at timestamptz not null default now()
);

create index if not exists receipts_company_idx on public.consulting_receipts(consulting_company_id);
create index if not exists receipts_sale_idx on public.consulting_receipts(sale_id);

-- ============================================================
--  8. consulting_payment_schedules
-- ============================================================
create table if not exists public.consulting_payment_schedules (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  sale_id uuid not null references public.consulting_pos_sales(id) on delete cascade,
  due_date date not null,
  expected_amount numeric(14,2) not null,
  currency text not null default 'USD',
  is_paid boolean not null default false,
  reminder_sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists payment_schedules_sale_idx on public.consulting_payment_schedules(sale_id);
create index if not exists payment_schedules_company_idx on public.consulting_payment_schedules(consulting_company_id);
create index if not exists payment_schedules_due_idx on public.consulting_payment_schedules(due_date);

-- ============================================================
--  9. consulting_audit_logs (financial action audit trail)
-- ============================================================
create table if not exists public.consulting_audit_logs (
  id uuid primary key default gen_random_uuid(),
  consulting_company_id uuid not null references public.consulting_companies(id) on delete cascade,
  action text not null, -- sale_created, payment_added, payment_reversed, txn_created, txn_reversed, transfer, account_created, etc.
  entity_type text,
  entity_id uuid,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  performed_by uuid,
  performed_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_company_idx on public.consulting_audit_logs(consulting_company_id);
create index if not exists audit_logs_entity_idx on public.consulting_audit_logs(entity_type, entity_id);

-- ============================================================
--  RLS Policies — every table isolated by consulting_company_id
--  No company can see another company's financial records.
-- ============================================================

alter table public.consulting_pos_sales enable row level security;
alter table public.consulting_pos_payments enable row level security;
alter table public.consulting_cashier_accounts enable row level security;
alter table public.consulting_cashier_txns enable row level security;
alter table public.consulting_cashier_categories enable row level security;
alter table public.consulting_cashier_settings enable row level security;
alter table public.consulting_receipts enable row level security;
alter table public.consulting_payment_schedules enable row level security;
alter table public.consulting_audit_logs enable row level security;

-- Helper: get the user's company id
-- (reuses the existing consulting_members pattern)
create or replace function public.my_consulting_company_id()
returns uuid
language sql
security definer
stable
as $$
  select consulting_company_id from public.consulting_members
  where user_id = auth.uid() and status = 'active'
  limit 1;
$$;

-- pos_sales: company members can CRUD their own sales
drop policy if exists "pos_sales_select_own" on public.consulting_pos_sales;
create policy "pos_sales_select_own" on public.consulting_pos_sales
  for select using (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "pos_sales_insert_own" on public.consulting_pos_sales;
create policy "pos_sales_insert_own" on public.consulting_pos_sales
  for insert with check (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "pos_sales_update_own" on public.consulting_pos_sales;
create policy "pos_sales_update_own" on public.consulting_pos_sales
  for update using (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "pos_sales_delete_own" on public.consulting_pos_sales;
create policy "pos_sales_delete_own" on public.consulting_pos_sales
  for delete using (consulting_company_id = public.my_consulting_company_id());

-- pos_payments
drop policy if exists "pos_payments_select_own" on public.consulting_pos_payments;
create policy "pos_payments_select_own" on public.consulting_pos_payments
  for select using (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "pos_payments_insert_own" on public.consulting_pos_payments;
create policy "pos_payments_insert_own" on public.consulting_pos_payments
  for insert with check (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "pos_payments_update_own" on public.consulting_pos_payments;
create policy "pos_payments_update_own" on public.consulting_pos_payments
  for update using (consulting_company_id = public.my_consulting_company_id());

-- cashier_accounts
drop policy if exists "cashier_accounts_select_own" on public.consulting_cashier_accounts;
create policy "cashier_accounts_select_own" on public.consulting_cashier_accounts
  for select using (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "cashier_accounts_insert_own" on public.consulting_cashier_accounts;
create policy "cashier_accounts_insert_own" on public.consulting_cashier_accounts
  for insert with check (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "cashier_accounts_update_own" on public.consulting_cashier_accounts;
create policy "cashier_accounts_update_own" on public.consulting_cashier_accounts
  for update using (consulting_company_id = public.my_consulting_company_id());

-- cashier_txns
drop policy if exists "cashier_txns_select_own" on public.consulting_cashier_txns;
create policy "cashier_txns_select_own" on public.consulting_cashier_txns
  for select using (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "cashier_txns_insert_own" on public.consulting_cashier_txns;
create policy "cashier_txns_insert_own" on public.consulting_cashier_txns
  for insert with check (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "cashier_txns_update_own" on public.consulting_cashier_txns;
create policy "cashier_txns_update_own" on public.consulting_cashier_txns
  for update using (consulting_company_id = public.my_consulting_company_id());

-- cashier_categories
drop policy if exists "cashier_categories_select_own" on public.consulting_cashier_categories;
create policy "cashier_categories_select_own" on public.consulting_cashier_categories
  for select using (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "cashier_categories_insert_own" on public.consulting_cashier_categories;
create policy "cashier_categories_insert_own" on public.consulting_cashier_categories
  for insert with check (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "cashier_categories_delete_own" on public.consulting_cashier_categories;
create policy "cashier_categories_delete_own" on public.consulting_cashier_categories
  for delete using (consulting_company_id = public.my_consulting_company_id());

-- cashier_settings
drop policy if exists "cashier_settings_select_own" on public.consulting_cashier_settings;
create policy "cashier_settings_select_own" on public.consulting_cashier_settings
  for select using (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "cashier_settings_upsert_own" on public.consulting_cashier_settings;
create policy "cashier_settings_upsert_own" on public.consulting_cashier_settings
  for insert with check (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "cashier_settings_update_own" on public.consulting_cashier_settings;
create policy "cashier_settings_update_own" on public.consulting_cashier_settings
  for update using (consulting_company_id = public.my_consulting_company_id());

-- receipts
drop policy if exists "receipts_select_own" on public.consulting_receipts;
create policy "receipts_select_own" on public.consulting_receipts
  for select using (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "receipts_insert_own" on public.consulting_receipts;
create policy "receipts_insert_own" on public.consulting_receipts
  for insert with check (consulting_company_id = public.my_consulting_company_id());

-- payment_schedules
drop policy if exists "payment_schedules_select_own" on public.consulting_payment_schedules;
create policy "payment_schedules_select_own" on public.consulting_payment_schedules
  for select using (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "payment_schedules_insert_own" on public.consulting_payment_schedules;
create policy "payment_schedules_insert_own" on public.consulting_payment_schedules
  for insert with check (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "payment_schedules_update_own" on public.consulting_payment_schedules;
create policy "payment_schedules_update_own" on public.consulting_payment_schedules
  for update using (consulting_company_id = public.my_consulting_company_id());

-- audit_logs
drop policy if exists "audit_logs_select_own" on public.consulting_audit_logs;
create policy "audit_logs_select_own" on public.consulting_audit_logs
  for select using (consulting_company_id = public.my_consulting_company_id());

drop policy if exists "audit_logs_insert_own" on public.consulting_audit_logs;
create policy "audit_logs_insert_own" on public.consulting_audit_logs
  for insert with check (consulting_company_id = public.my_consulting_company_id());

-- ============================================================
--  Updated_at triggers
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pos_sales_touch on public.consulting_pos_sales;
create trigger pos_sales_touch before update on public.consulting_pos_sales
  for each row execute function public.touch_updated_at();

drop trigger if exists cashier_accounts_touch on public.consulting_cashier_accounts;
create trigger cashier_accounts_touch before update on public.consulting_cashier_accounts
  for each row execute function public.touch_updated_at();

drop trigger if exists cashier_settings_touch on public.consulting_cashier_settings;
create trigger cashier_settings_touch before update on public.consulting_cashier_settings
  for each row execute function public.touch_updated_at();

-- ============================================================
--  Seed default categories for existing companies (idempotent)
-- ============================================================
insert into public.consulting_cashier_categories (consulting_company_id, kind, name, is_default)
select c.id, 'income', cat.name, true
from public.consulting_companies c
cross join (values
  ('Tour package payment'), ('Visa service payment'), ('University application service'),
  ('Consulting service'), ('Client advance payment'), ('Full client payment'),
  ('Commission income'), ('Additional service income'), ('Refund returned to company'),
  ('Investment'), ('Other income')
) as cat(name)
where not exists (
  select 1 from public.consulting_cashier_categories cc
  where cc.consulting_company_id = c.id and cc.kind = 'income' and cc.name = cat.name
)
on conflict (consulting_company_id, kind, name) do nothing;

insert into public.consulting_cashier_categories (consulting_company_id, kind, name, is_default)
select c.id, 'expense', cat.name, true
from public.consulting_companies c
cross join (values
  ('Office rent'), ('Electricity'), ('Gas'), ('Water'), ('Internet'), ('Telephone'),
  ('Employee salary'), ('Employee bonus'), ('Advertising'), ('Marketing'),
  ('Transportation'), ('Business trip'), ('Office equipment'), ('Office supplies'),
  ('Software subscription'), ('Bank commission'), ('Tax'), ('Client refund'),
  ('Partner payment'), ('Document preparation'), ('Translation service'),
  ('Courier'), ('Maintenance'), ('Other expense')
) as cat(name)
where not exists (
  select 1 from public.consulting_cashier_categories cc
  where cc.consulting_company_id = c.id and cc.kind = 'expense' and cc.name = cat.name
)
on conflict (consulting_company_id, kind, name) do nothing;

-- ============================================================
--  Seed default accounts for existing companies (idempotent)
-- ============================================================
insert into public.consulting_cashier_accounts (consulting_company_id, name, kind, currency, created_by)
select c.id, acc.name, acc.kind, 'USD', c.owner_id
from public.consulting_companies c
cross join (values
  ('Main cash register', 'main_cash'),
  ('Office cash', 'office_cash'),
  ('Bank account', 'bank_account'),
  ('Bank card', 'bank_card'),
  ('Online payment account', 'online'),
  ('Other account', 'other')
) as acc(name, kind)
where not exists (
  select 1 from public.consulting_cashier_accounts ca
  where ca.consulting_company_id = c.id and ca.kind = acc.kind
)
on conflict do nothing;

-- ============================================================
--  Seed cashier settings for existing companies
-- ============================================================
insert into public.consulting_cashier_settings (consulting_company_id, opening_balance, currency)
select id, 0, 'USD' from public.consulting_companies
where not exists (
  select 1 from public.consulting_cashier_settings cs
  where cs.consulting_company_id = consulting_companies.id
)
on conflict (consulting_company_id) do nothing;
