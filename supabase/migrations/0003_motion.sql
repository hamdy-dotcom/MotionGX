-- =====================================================================
-- MotionGX — 0003_motion.sql (Phase 3)
-- Brand facts, music library, per-video music choice, render progress,
-- Realtime on renders, and the `music` / `renders` storage buckets.
-- =====================================================================

-- Brand facts (summarized from the homepage + up to 3 more pages).
alter table public.brand_profiles
  add column if not exists facts jsonb not null default '{}'::jsonb;

-- Generated music library (24 tracks: 3 paces × 4 moods × 2 variations).
create table if not exists public.music_tracks (
  id            uuid primary key default gen_random_uuid(),
  bpm           int  not null check (bpm between 60 and 180),
  mood          text not null check (mood in ('energetic', 'warm', 'corporate', 'luxury')),
  pace          text not null check (pace in ('calm', 'medium', 'fast')),
  variation     int  not null default 1,
  duration_s    numeric(6,2) not null,
  storage_path  text not null unique,
  created_at    timestamptz not null default now(),
  unique (pace, mood, variation)
);

alter table public.music_tracks enable row level security;
create policy music_tracks_select on public.music_tracks for select to authenticated using (true);
revoke insert, update, delete, truncate on public.music_tracks from anon, authenticated;

-- Per-video music choice. Music is included in the export price.
alter table public.videos
  add column if not exists music_enabled  boolean not null default true,
  add column if not exists music_mood     text check (music_mood in ('energetic', 'warm', 'corporate', 'luxury')),
  add column if not exists music_track_id uuid references public.music_tracks(id) on delete set null;

-- Render progress (0..1), written by the renderer (service role).
alter table public.renders
  add column if not exists progress numeric(5,4) not null default 0 check (progress between 0 and 1),
  add column if not exists updated_at timestamptz not null default now();

-- Studio follows render progress through Realtime (RLS still applies: renders_select).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'renders'
  ) then
    alter publication supabase_realtime add table public.renders;
  end if;
end $$;

-- Storage: `music` is public (the in-browser preview and the renderer stream it).
insert into storage.buckets (id, name, public)
values ('music', 'music', true)
on conflict (id) do nothing;

-- Storage: `renders` is private. Paths: {workspace_id}/{render_id}.mp4 — members read, server writes.
insert into storage.buckets (id, name, public)
values ('renders', 'renders', false)
on conflict (id) do nothing;

create policy renders_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'renders' and public.is_member(public.storage_path_workspace(name)));
