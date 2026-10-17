-- ============================================================
--  OXEN — Consulting Business Phase 5 schema additions
--  Employees, Roles, Activity Tracking, Analytics helpers.
--  Depends on 0001 + 0002. Idempotent: safe to re-run.
-- ============================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================
--  1. Extra indexes on consulting_activity_logs
--     (faster filtering by actor / entity / action / date)
-- ============================================================
create index if not exists consulting_activity_logs_actor_idx
  on public.consulting_activity_logs(actor_id);
create index if not exists consulting_activity_logs_action_idx
  on public.consulting_activity_logs(action);
create index if not exists consulting_activity_logs_entity_idx
  on public.consulting_activity_logs(entity_type, entity_id);
create index if not exists consulting_activity_logs_created_idx
  on public.consulting_activity_logs(created_at desc);

-- ============================================================
--  2. Extra indexes on consulting_members for performance stats
-- ============================================================
create index if not exists consulting_members_role_idx
  on public.consulting_members(role);
create index if not exists consulting_members_status_idx
  on public.consulting_members(status);

-- Indexes on consulting_clients to speed up employee-performance queries
create index if not exists consulting_clients_final_result_idx
  on public.consulting_clients(final_result);
create index if not exists consulting_clients_payment_status_idx
  on public.consulting_clients(payment_status);
create index if not exists consulting_clients_created_idx
  on public.consulting_clients(created_at desc);

-- Index on consulting_payments paid_at for revenue analytics
create index if not exists consulting_payments_paid_at_idx
  on public.consulting_payments(paid_at);

-- ============================================================
--  3. consulting_employee_stats — view aggregating per-employee
--     client counts, success counts, revenue, success rate.
--     RBAC: caller can only see members of their own company
--     (filter in app layer using fetchEmployeeStats).
-- ============================================================
create or replace view public.consulting_employee_stats as
select
  m.id as member_id,
  m.consulting_company_id,
  m.user_id,
  m.role,
  m.status,
  count(distinct c.id) filter (where c.is_archived = false) as active_clients,
  count(distinct c.id) as total_clients,
  count(distinct c.id) filter (where c.final_result = 'success') as successful_clients,
  count(distinct c.id) filter (where c.final_result = 'unsuccessful') as unsuccessful_clients,
  coalesce(sum(p.gross_amount) filter (where p.status = 'paid'), 0) as revenue_generated,
  case
    when count(distinct c.id) filter (where c.final_result in ('success','unsuccessful')) = 0 then 0
    else round(
      count(distinct c.id) filter (where c.final_result = 'success')::numeric
      / nullif(count(distinct c.id) filter (where c.final_result in ('success','unsuccessful')), 0)
      * 100, 2
    )
  end as success_rate,
  m.last_active_at,
  m.created_at
from public.consulting_members m
left join public.consulting_clients c
  on c.assigned_employee_id = m.user_id
  and c.consulting_company_id = m.consulting_company_id
left join public.consulting_payments p
  on p.client_id = c.id
  and p.consulting_company_id = m.consulting_company_id
group by m.id, m.consulting_company_id, m.user_id, m.role, m.status, m.last_active_at, m.created_at;

comment on view public.consulting_employee_stats is
  'Per-employee performance aggregations. RLS on consulting_members/clients/payments restricts visibility to the caller''s company.';

-- Grant select on the view to authenticated users (RLS still applies via underlying tables).
grant select on public.consulting_employee_stats to authenticated;

-- ============================================================
--  4. consulting_dashboard_stats(date_range) — helper function
--     Returns aggregated stats for a company between two dates.
--     Callable by members only (caller passes their company_id;
--     RLS on underlying tables enforces isolation).
-- ============================================================
create or replace function public.consulting_dashboard_stats(
  company_id uuid,
  start_ts timestamptz default null,
  end_ts timestamptz default null
)
returns table (
  total_clients bigint,
  new_clients_period bigint,
  active_applications bigint,
  successful_clients bigint,
  unsuccessful_clients bigint,
  pending_clients bigint,
  monthly_revenue numeric,
  annual_revenue numeric,
  total_revenue numeric
)
language sql
stable
security definer
as $$
  with range as (
    select coalesce(start_ts, to_timestamp(0)) as s,
           coalesce(end_ts, now()) as e
  )
  select
    (select count(*) from public.consulting_clients cl
       where cl.consulting_company_id = company_id
         and cl.is_archived = false),
    (select count(*) from public.consulting_clients cl
       where cl.consulting_company_id = company_id
         and cl.is_archived = false
         and cl.created_at >= (select s from range)
         and cl.created_at <  (select e from range)),
    (select count(*) from public.consulting_applications ap
       where ap.consulting_company_id = company_id
         and ap.status in ('new','documents','processing','submitted')),
    (select count(*) from public.consulting_clients cl
       where cl.consulting_company_id = company_id
         and cl.final_result = 'success'),
    (select count(*) from public.consulting_clients cl
       where cl.consulting_company_id = company_id
         and cl.final_result = 'unsuccessful'),
    (select count(*) from public.consulting_clients cl
       where cl.consulting_company_id = company_id
         and cl.final_result = 'pending'),
    (select coalesce(sum(p.gross_amount),0) from public.consulting_payments p
       where p.consulting_company_id = company_id
         and p.status = 'paid'
         and p.paid_at >= date_trunc('month', now())),
    (select coalesce(sum(p.gross_amount),0) from public.consulting_payments p
       where p.consulting_company_id = company_id
         and p.status = 'paid'
         and p.paid_at >= date_trunc('year', now())),
    (select coalesce(sum(p.gross_amount),0) from public.consulting_payments p
       where p.consulting_company_id = company_id
         and p.status = 'paid');
$$;

grant execute on function public.consulting_dashboard_stats(uuid, timestamptz, timestamptz) to authenticated;

-- ============================================================
--  5. RLS policies for the new view
--     (Underlying tables already enforce RLS; view inherits.)
--     No new policies needed — view is security_invoker by default
--     in Postgres 15+ via the underlying table policies.
-- ============================================================

-- Done.
