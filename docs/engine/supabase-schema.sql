-- Puzzle Engine schema for Neo Puzzle Lovers
-- This is intentionally open enough for a browser-only MVP.
-- For production/editor-only usage, replace the public INSERT/UPDATE policies
-- with authenticated team-only policies.

create extension if not exists pgcrypto;

create table if not exists public.puzzle_activities (
  id text primary key,
  title text not null,
  category text not null,
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.puzzle_rankings (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null references public.puzzle_activities(id) on delete cascade,
  player_name text not null,
  score integer not null,
  time_ms integer not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists puzzle_rankings_activity_idx
  on public.puzzle_rankings (activity_id, score desc, time_ms asc);

alter table public.puzzle_activities enable row level security;
alter table public.puzzle_rankings enable row level security;

drop policy if exists "public read activities" on public.puzzle_activities;
create policy "public read activities"
  on public.puzzle_activities
  for select
  using (true);

drop policy if exists "public insert activities" on public.puzzle_activities;
create policy "public insert activities"
  on public.puzzle_activities
  for insert
  with check (true);

drop policy if exists "public update activities" on public.puzzle_activities;
create policy "public update activities"
  on public.puzzle_activities
  for update
  using (true)
  with check (true);

drop policy if exists "public read rankings" on public.puzzle_rankings;
create policy "public read rankings"
  on public.puzzle_rankings
  for select
  using (true);

drop policy if exists "public insert rankings" on public.puzzle_rankings;
create policy "public insert rankings"
  on public.puzzle_rankings
  for insert
  with check (true);

insert into storage.buckets (id, name, public)
values ('puzzle-audio', 'puzzle-audio', true)
on conflict (id) do nothing;

drop policy if exists "public read puzzle audio" on storage.objects;
create policy "public read puzzle audio"
  on storage.objects
  for select
  using (bucket_id = 'puzzle-audio');

drop policy if exists "public upload puzzle audio" on storage.objects;
create policy "public upload puzzle audio"
  on storage.objects
  for insert
  with check (bucket_id = 'puzzle-audio');
