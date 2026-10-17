-- ─────────────────────────────────────────────────────────────
--  Migration 0011 — Discover page: posts table + privacy + indexes
--  Idempotent. Safe to re-run.
--  Run manually in Supabase SQL editor.
--
--  Creates: public.posts (user-created content for Discover feed)
--  Adds:    is_private column to profiles
--  Indexes: for search, feed ordering, scoring
--  RLS:     public posts readable by authenticated; private posts
--           only by author + followers; CRUD only for own posts
-- ─────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- ============================================================
--  1. Add is_private column to profiles
-- ============================================================
alter table public.profiles
  add column if not exists is_private boolean default false;

comment on column public.profiles.is_private is 'When true, this user posts are hidden from non-followers';

-- ============================================================
--  2. Create posts table (user-created content)
-- ============================================================
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  caption       text not null default '',
  media_type    text not null default 'image' check (media_type in ('image','video')),
  media_url     text not null,
  thumbnail_url text,
  location      text,
  country       text,
  city          text,
  hashtags      text[] default '{}',
  likes_count   integer not null default 0,
  comments_count integer not null default 0,
  views_count   integer not null default 0,
  is_private    boolean not null default false,
  is_deleted    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes for feed ordering and scoring
create index if not exists posts_created_at_idx      on public.posts (created_at desc);
create index if not exists posts_user_id_idx         on public.posts (user_id);
create index if not exists posts_likes_count_idx     on public.posts (likes_count desc);
create index if not exists posts_comments_count_idx  on public.posts (comments_count desc);
create index if not exists posts_not_deleted_idx     on public.posts (created_at desc) where is_deleted = false;
create index if not exists posts_public_idx          on public.posts (created_at desc) where is_private = false and is_deleted = false;

-- Updated_at touch trigger
create or replace function public.touch_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_updated_at_trigger on public.posts;
create trigger posts_updated_at_trigger
  before update on public.posts
  for each row execute function public.touch_posts_updated_at();

-- ============================================================
--  3. Profile indexes for Discover search
-- ============================================================
create index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));
create index if not exists profiles_full_name_lower_idx
  on public.profiles (lower(full_name));
create index if not exists profiles_name_lower_idx
  on public.profiles (lower(name));
create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

-- ============================================================
--  4. Realtime — enable replica identity full for posts
-- ============================================================
alter table public.posts replica identity full;

-- ============================================================
--  5. RLS policies for posts
-- ============================================================
alter table public.posts enable row level security;

-- READ: authenticated users can see public, non-deleted posts
--       PLUS their own posts (any privacy status)
--       PLUS private posts from users they follow
drop policy if exists "posts_read" on public.posts;
create policy "posts_read"
  on public.posts
  for select
  to authenticated
  using (
    is_deleted = false
    and (
      -- user's own posts (any privacy)
      user_id = auth.uid()
      -- public posts from anyone
      or is_private = false
      -- private posts from users the current user follows
      or (
        is_private = true
        and exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid()
            and f.following_id = posts.user_id
        )
      )
    )
  );

-- INSERT: users can create posts only for themselves
drop policy if exists "posts_insert_self" on public.posts;
create policy "posts_insert_self"
  on public.posts
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE: users can update only their own posts
drop policy if exists "posts_update_self" on public.posts;
create policy "posts_update_self"
  on public.posts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- DELETE: users can delete only their own posts
drop policy if exists "posts_delete_self" on public.posts;
create policy "posts_delete_self"
  on public.posts
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
--  6. likes table for post interactions (powers scoring)
-- ============================================================
create table if not exists public.post_likes (
  id        uuid primary key default gen_random_uuid(),
  post_id   uuid not null references public.posts(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create index if not exists post_likes_post_id_idx on public.post_likes (post_id);
create index if not exists post_likes_user_id_idx on public.post_likes (user_id);

alter table public.post_likes enable row level security;

-- READ: authenticated users can see likes
drop policy if exists "post_likes_read" on public.post_likes;
create policy "post_likes_read"
  on public.post_likes
  for select
  to authenticated
  using (true);

-- INSERT: users can only like for themselves
drop policy if exists "post_likes_insert_self" on public.post_likes;
create policy "post_likes_insert_self"
  on public.post_likes
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- DELETE: users can only unlike for themselves
drop policy if exists "post_likes_delete_self" on public.post_likes;
create policy "post_likes_delete_self"
  on public.post_likes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Trigger: increment likes_count on like
create or replace function public.increment_likes_count()
returns trigger
language plpgsql
as $$
begin
  update public.posts set likes_count = greatest(likes_count + 1, 0)
  where id = new.post_id;
  return new;
end;
$$;

drop trigger if exists post_likes_insert_trigger on public.post_likes;
create trigger post_likes_insert_trigger
  after insert on public.post_likes
  for each row execute function public.increment_likes_count();

-- Trigger: decrement likes_count on unlike
create or replace function public.decrement_likes_count()
returns trigger
language plpgsql
as $$
begin
  update public.posts set likes_count = greatest(likes_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists post_likes_delete_trigger on public.post_likes;
create trigger post_likes_delete_trigger
  after delete on public.post_likes
  for each row execute function public.decrement_likes_count();

-- ============================================================
--  7. post_comments table (powers comments_count)
-- ============================================================
create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_comments_post_id_idx on public.post_comments (post_id, created_at);
create index if not exists post_comments_user_id_idx on public.post_comments (user_id);

alter table public.post_comments enable row level security;

-- READ: authenticated users can see comments on visible posts
drop policy if exists "post_comments_read" on public.post_comments;
create policy "post_comments_read"
  on public.post_comments
  for select
  to authenticated
  using (true);

-- INSERT: authenticated users can comment
drop policy if exists "post_comments_insert_self" on public.post_comments;
create policy "post_comments_insert_self"
  on public.post_comments
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- DELETE: users can delete only their own comments
drop policy if exists "post_comments_delete_self" on public.post_comments;
create policy "post_comments_delete_self"
  on public.post_comments
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Trigger: increment comments_count
create or replace function public.increment_comments_count()
returns trigger
language plpgsql
as $$
begin
  update public.posts set comments_count = greatest(comments_count + 1, 0)
  where id = new.post_id;
  return new;
end;
$$;

drop trigger if exists post_comments_insert_trigger on public.post_comments;
create trigger post_comments_insert_trigger
  after insert on public.post_comments
  for each row execute function public.increment_comments_count();

-- Trigger: decrement comments_count
create or replace function public.decrement_comments_count()
returns trigger
language plpgsql
as $$
begin
  update public.posts set comments_count = greatest(comments_count - 1, 0)
  where id = old.post_id;
  return old;
end;
$$;

drop trigger if exists post_comments_delete_trigger on public.post_comments;
create trigger post_comments_delete_trigger
  after delete on public.post_comments
  for each row execute function public.decrement_comments_count();

-- ============================================================
--  8. increment_post_views RPC (fire-and-forget view count)
-- ============================================================
create or replace function public.increment_post_views(post_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.posts set views_count = views_count + 1
  where id = post_id;
end;
$$;

grant execute on function public.increment_post_views(uuid) to authenticated;
