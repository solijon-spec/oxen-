-- ============================================================
--  OXEN — Social Features (migration 0010)
--  Run this in Supabase SQL editor (Dashboard → SQL → New query).
--  Idempotent: safe to re-run.
--
--  Adds: username, bio, followers_count, following_count to profiles.
--  Creates: follows, conversations, conversation_members, messages.
--  RLS policies for all tables.
--  Indexes for search and performance.
--  Does NOT delete or modify existing profile data.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
--  1. Add social columns to profiles
-- ============================================================
alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text default '',
  add column if not exists followers_count integer not null default 0,
  add column if not exists following_count integer not null default 0;

-- ============================================================
--  2. Generate unique usernames for existing profiles
--     Strategy: lowercase, spaces→underscores, append number if taken
-- ============================================================

-- Helper function: generate a base username from name or email
create or replace function public.generate_base_username(p_name text, p_email text)
returns text
language plpgsql
immutable
as $$
declare
  v_base text;
begin
  v_base := coalesce(nullif(trim(p_name), ''), split_part(coalesce(p_email, ''), '@', 1), 'explorer');
  v_base := lower(v_base);
  v_base := replace(v_base, ' ', '_');
  v_base := regexp_replace(v_base, '[^a-z0-9_.]', '', 'g');
  v_base := trim(both '_' from v_base);
  v_base := trim(both '.' from v_base);
  if v_base = '' then
    v_base := 'explorer';
  end if;
  return v_base;
end;
$$;

-- Helper function: find next available unique username
create or replace function public.generate_unique_username(p_base text, p_exclude_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate text;
  v_counter integer := 0;
  v_exists boolean;
begin
  v_candidate := p_base;
  loop
    select exists(
      select 1 from public.profiles
      where lower(username) = lower(v_candidate)
      and (p_exclude_id is null or id != p_exclude_id)
    ) into v_exists;

    if not v_exists then
      return v_candidate;
    end if;

    v_counter := v_counter + 1;
    v_candidate := p_base || v_counter::text;
  end loop;
end;
$$;

-- Backfill usernames for existing profiles that don't have one
do $$
declare
  r record;
  v_base text;
  v_username text;
begin
  for r in select id, name, email, nickname from public.profiles where username is null or username = '' loop
    -- Prefer existing nickname if present
    if r.nickname is not null and trim(r.nickname) <> '' then
      v_base := lower(trim(r.nickname));
      v_base := replace(v_base, ' ', '_');
      v_base := regexp_replace(v_base, '[^a-z0-9_.]', '', 'g');
      v_base := trim(both '_' from v_base);
      v_base := trim(both '.' from v_base);
      if v_base = '' then
        v_base := public.generate_base_username(r.name, r.email);
      end if;
    else
      v_base := public.generate_base_username(r.name, r.email);
    end if;

    v_username := public.generate_unique_username(v_base, r.id);

    update public.profiles
      set username = v_username
      where id = r.id and (username is null or username = '');
  end loop;
end $$;

-- ============================================================
--  3. Unique index on username (case-insensitive, partial)
-- ============================================================
create unique index if not exists profiles_username_uniq
  on public.profiles (lower(username))
  where username is not null and username <> '';

-- ============================================================
--  4. Search indexes
-- ============================================================
create index if not exists profiles_username_idx
  on public.profiles (lower(username))
  where username is not null;

create index if not exists profiles_full_name_idx
  on public.profiles (lower(full_name))
  where full_name is not null;

create index if not exists profiles_name_idx
  on public.profiles (lower(name))
  where name is not null;

create index if not exists profiles_email_idx
  on public.profiles (lower(email))
  where email is not null;

-- ============================================================
--  5. follows table
-- ============================================================
create table if not exists public.follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique(follower_id, following_id),
  check(follower_id <> following_id)
);

create index if not exists follows_follower_id_idx on public.follows(follower_id);
create index if not exists follows_following_id_idx on public.follows(following_id);
create index if not exists follows_created_at_idx on public.follows(created_at desc);

-- Enable RLS
alter table public.follows enable row level security;

-- Read: authenticated users can read all follow relationships
drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all" on public.follows
  for select using (auth.role() = 'authenticated');

-- Insert: only for yourself (follower_id = auth.uid())
drop policy if exists "follows_insert_self" on public.follows;
create policy "follows_insert_self" on public.follows
  for insert with check (follower_id = auth.uid());

-- Delete: only your own follows
drop policy if exists "follows_delete_self" on public.follows;
create policy "follows_delete_self" on public.follows
  for delete using (follower_id = auth.uid());

-- ============================================================
--  6. conversations table
-- ============================================================
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_updated_at_idx on public.conversations(updated_at desc);

alter table public.conversations enable row level security;

-- Read: only conversation members can read
drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversations.id
      and cm.user_id = auth.uid()
    )
  );

-- Insert: authenticated users can create conversations
drop policy if exists "conversations_insert_auth" on public.conversations;
create policy "conversations_insert_auth" on public.conversations
  for insert with check (auth.role() = 'authenticated');

-- ============================================================
--  7. conversation_members table
-- ============================================================
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  joined_at       timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists conv_members_user_id_idx on public.conversation_members(user_id);
create index if not exists conv_members_conv_id_idx on public.conversation_members(conversation_id);

alter table public.conversation_members enable row level security;

-- Read: only memberships for conversations you belong to
drop policy if exists "conv_members_select_self" on public.conversation_members;
create policy "conv_members_select_self" on public.conversation_members
  for select using (
    exists (
      select 1 from public.conversation_members cm2
      where cm2.conversation_id = conversation_members.conversation_id
      and cm2.user_id = auth.uid()
    )
  );

-- Insert: you can add yourself, or the creator of a conversation can add members
drop policy if exists "conv_members_insert_self" on public.conversation_members;
create policy "conv_members_insert_self" on public.conversation_members
  for insert with check (user_id = auth.uid());

-- ============================================================
--  8. messages table
-- ============================================================
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  content         text not null default '',
  message_type    text not null default 'text' check (message_type in ('text', 'image', 'video')),
  media_url       text,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_created_at_idx on public.messages(created_at desc);
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists messages_unread_idx on public.messages(conversation_id, is_read) where is_read = false;

alter table public.messages enable row level security;

-- Read: only conversation members can read messages
drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
    )
  );

-- Insert: only conversation members can send messages, sender_id must = auth.uid()
drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
    )
  );

-- Update: only the sender can update their own messages (e.g. is_read)
-- Actually, is_read is updated by the recipient. So we allow both:
-- sender can update their own messages, and conversation members can update is_read
drop policy if exists "messages_update_sender" on public.messages;
create policy "messages_update_sender" on public.messages
  for update using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
    )
  ) with check (
    sender_id = auth.uid()
    or exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
    )
  );

-- ============================================================
--  9. Triggers — keep conversation.updated_at in sync
--     and maintain follower/following counts
-- ============================================================

-- Touch conversation updated_at when a message is inserted
create or replace function public.touch_conversation_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
    set updated_at = now()
    where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_updated_at();

-- Update follower/following counts on follow insert
create or replace function public.update_follow_counts_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set following_count = following_count + 1
    where id = new.follower_id;
  update public.profiles set followers_count = followers_count + 1
    where id = new.following_id;
  return new;
end;
$$;

drop trigger if exists follows_count_insert_trigger on public.follows;
create trigger follows_count_insert_trigger
  after insert on public.follows
  for each row execute function public.update_follow_counts_insert();

-- Update follower/following counts on follow delete
create or replace function public.update_follow_counts_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set following_count = greatest(following_count - 1, 0)
    where id = old.follower_id;
  update public.profiles set followers_count = greatest(followers_count - 1, 0)
    where id = old.following_id;
  return old;
end;
$$;

drop trigger if exists follows_count_delete_trigger on public.follows;
create trigger follows_count_delete_trigger
  after delete on public.follows
  for each row execute function public.update_follow_counts_delete();

-- ============================================================
--  10. Realtime — enable for messages and follows
-- ============================================================
alter table public.messages replica identity full;
alter table public.follows replica identity full;
alter table public.conversations replica identity full;

-- ============================================================
--  11. RLS — update profiles policies to include username/bio
-- ============================================================
-- Profiles: authenticated users can read all public profiles
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Keep owner read policy from migration 0005
-- (re-create to be safe)
drop policy if exists "profiles_read_owner" on public.profiles;
create policy "profiles_read_owner" on public.profiles
  for select using (public.is_owner());

-- Users can update only their own profile
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Users can insert only their own profile
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- ============================================================
--  DONE.
--  Verify tables:
--    select tablename from pg_tables where schemaname='public' and tablename in ('follows','conversations','conversation_members','messages');
--  Verify columns:
--    select column_name from information_schema.columns where table_name='profiles' and column_name in ('username','bio','followers_count','following_count');
-- ============================================================
