-- ──────────────────────────────────────────────────────────────
-- 0018 — Tour Package price_type column
--
-- Adds a `price_type` column to consulting_posts so the AI
-- recommendation engine (and public pages) can correctly compute
-- estimated total cost for N travelers.
--
-- Values: 'per_person' (default) or 'total'
-- This is a safe, additive migration — no existing data is changed.
-- ──────────────────────────────────────────────────────────────

alter table public.consulting_posts
  add column if not exists price_type text not null default 'per_person'
  check (price_type in ('per_person', 'total'));

-- Backfill: any existing rows get 'per_person' (safest assumption)
update public.consulting_posts
  set price_type = 'per_person'
  where price_type is null or price_type not in ('per_person', 'total');
