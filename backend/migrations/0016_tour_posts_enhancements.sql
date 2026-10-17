-- ──────────────────────────────────────────────────────────────
-- 0016 — Tour Posts Enhancements
--
-- Adds tour-package-specific columns to the existing consulting_posts
-- table (created in migration 0001). Does NOT recreate the table.
-- Adds RLS policies that check consulting_companies.owner_id directly
-- (works even if consulting_members table is empty/absent).
-- ──────────────────────────────────────────────────────────────

-- ── 1. Add tour-specific columns to consulting_posts ──

alter table public.consulting_posts
  add column if not exists destination_country text,
  add column if not exists destination_city text,
  add column if not exists cover_image text,
  add column if not exists gallery jsonb default '[]',
  add column if not exists video_url text,
  add column if not exists short_description text,
  add column if not exists full_description text,
  add column if not exists price numeric,
  add column if not exists old_price numeric,
  add column if not exists currency text default 'USD',
  add column if not exists departure_date date,
  add column if not exists return_date date,
  add column if not exists booking_deadline date,
  add column if not exists available_seats int,
  add column if not exists hotel_name text,
  add column if not exists hotel_rating int,
  add column if not exists room_type text,
  add column if not exists meal_plan text,
  add column if not exists transport text,
  add column if not exists airline text,
  add column if not exists departure_airport text,
  add column if not exists flight_included boolean default false,
  add column if not exists hotel_included boolean default false,
  add column if not exists visa_included boolean default false,
  add column if not exists airport_transfer_included boolean default false,
  add column if not exists guide_included boolean default false,
  add column if not exists travel_insurance_included boolean default false,
  add column if not exists meals_included boolean default false,
  add column if not exists included_items jsonb default '[]',
  add column if not exists not_included_items jsonb default '[]',
  add column if not exists itinerary jsonb default '[]',
  add column if not exists contact_override jsonb default '{}';

-- Index for public queries (status + company)
create index if not exists consulting_posts_published_idx
  on public.consulting_posts (status, consulting_company_id)
  where status = 'published';

-- Index for filtering by destination
create index if not exists consulting_posts_destination_idx
  on public.consulting_posts (destination_country)
  where status = 'published';

-- ── 2. RLS: owner-based access (works without consulting_members) ──
-- The existing RLS from migration 0001 uses is_consulting_member() which
-- checks consulting_members. These additional policies check owner_id
-- directly on consulting_companies, so agency owners can CRUD their posts
-- even if consulting_members is empty.

-- Drop old policies if they exist (idempotent)
drop policy if exists "tp_owner_read" on public.consulting_posts;
drop policy if exists "tp_owner_insert" on public.consulting_posts;
drop policy if exists "tp_owner_update" on public.consulting_posts;
drop policy if exists "tp_owner_delete" on public.consulting_posts;

-- Read: owner of the company OR public when status='published'
create policy "tp_owner_read" on public.consulting_posts
  for select using (
    exists (
      select 1 from public.consulting_companies c
      where c.id = consulting_company_id
      and c.owner_id = auth.uid()
    )
    or status = 'published'
  );

-- Insert: must own the company
create policy "tp_owner_insert" on public.consulting_posts
  for insert with check (
    exists (
      select 1 from public.consulting_companies c
      where c.id = consulting_company_id
      and c.owner_id = auth.uid()
    )
  );

-- Update: must own the company
create policy "tp_owner_update" on public.consulting_posts
  for update using (
    exists (
      select 1 from public.consulting_companies c
      where c.id = consulting_company_id
      and c.owner_id = auth.uid()
    )
  );

-- Delete: must own the company
create policy "tp_owner_delete" on public.consulting_posts
  for delete using (
    exists (
      select 1 from public.consulting_companies c
      where c.id = consulting_company_id
      and c.owner_id = auth.uid()
    )
  );

-- ── 3. View counter RPC (idempotent) ──
create or replace function public.increment_post_views(p_post_id uuid)
returns void
language sql
security definer
as $$
  update public.consulting_posts
  set views = views + 1
  where id = p_post_id and status = 'published';
$$;
