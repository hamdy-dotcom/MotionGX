-- =====================================================================
-- MotionGX — 0004_generative.sql (Phase 3B: every video generated from scratch)
-- Run after 0003_motion.sql.
-- =====================================================================

create extension if not exists vector;

-- Videos are generated asynchronously; "needs_direction" = no version passed QA (offer another direction, free).
alter table public.videos drop constraint if exists videos_status_check;
alter table public.videos add constraint videos_status_check
  check (status in ('draft', 'generating', 'ready', 'review', 'exporting', 'failed', 'needs_direction'));
alter table public.videos
  add column if not exists generation jsonb not null default '{}'::jsonb;  -- {stage, round, detail, updated_at, error?}

-- Each version stores the bespoke composition, its treatment, energy map, QA report and generated audio.
alter table public.video_versions
  add column if not exists composition_code text,
  add column if not exists composition_js   text,
  add column if not exists treatment        jsonb,
  add column if not exists energy_map       jsonb,
  add column if not exists qa               jsonb,
  add column if not exists audio            jsonb;  -- {mix, sfx, music: storage paths in `music`, lufs, hits}

-- Inspiration library: internal only, never shown to users. Seeded from data/motion-refs.json (ours) and
-- scripts/refs/prompt-motion.json (technique cards + links; creators' prompts are never stored here).
create table if not exists public.motion_refs (
  id            text primary key,
  title         text not null,
  source_url    text,
  creator       text not null,
  category      text not null,
  tags          text[] not null default '{}',
  prompt_text   text not null,
  code_snippet  text,
  embedding     vector(384),
  card          jsonb,          -- technique card (English, written by us): summary, motion_language, techniques, pacing, …
  license_note  text not null,
  created_at    timestamptz not null default now()
);
alter table public.motion_refs enable row level security;
create policy motion_refs_select on public.motion_refs for select to authenticated using (true);
revoke insert, update, delete, truncate on public.motion_refs from anon, authenticated;

-- Treatment history for the novelty check (last 10 per workspace, last 50 globally).
create table if not exists public.motion_treatments (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  video_id         uuid references public.videos(id) on delete set null,
  concept          text not null,
  motion_language  text not null,
  ref_ids          text[] not null default '{}',
  embedding        vector(384) not null,
  created_at       timestamptz not null default now()
);
create index if not exists motion_treatments_ws_created_idx on public.motion_treatments(workspace_id, created_at desc);
create index if not exists motion_treatments_created_idx on public.motion_treatments(created_at desc);
create index if not exists motion_treatments_embedding_idx on public.motion_treatments using hnsw (embedding vector_cosine_ops);
alter table public.motion_treatments enable row level security;
create policy motion_treatments_select on public.motion_treatments for select to authenticated using (public.is_member(workspace_id));
revoke insert, update, delete, truncate on public.motion_treatments from anon, authenticated;

-- AI usage: per-video attribution + the new pipeline steps. System jobs (e.g. seeding the inspiration
-- library) log with workspace_id null: they are invisible to members and don't count toward any limit.
alter table public.ai_usage add column if not exists video_id uuid references public.videos(id) on delete set null;
alter table public.ai_usage alter column workspace_id drop not null;
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('brand_scrape', 'brand_tone', 'brand_facts', 'script', 'rewrite_scene', 'request_edit', 'director', 'motion_code', 'vision_qa', 'ref_card'));
create index if not exists ai_usage_video_idx on public.ai_usage(video_id);
