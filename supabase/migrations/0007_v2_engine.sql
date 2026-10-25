-- =====================================================================
-- MotionGX — 0007_v2_engine.sql (v2: bespoke compositions per video)
-- Run after 0006. Removes the v1 engine (MotionSpec, music library, refs,
-- illustrations), deletes test videos, then creates the v2 pipeline tables.
-- WARNING: main's v1 engine stops working once this runs.
-- =====================================================================

begin;

-- ── 1. Drop the v1 engine ────────────────────────────────────────────
-- videos.music_track_id references music_tracks: drop the columns first.
alter table public.videos
  drop column if exists music_track_id,
  drop column if exists music_enabled,
  drop column if exists music_mood,
  drop column if exists generation;

drop table if exists public.illustration_uses cascade;
drop table if exists public.illustrations cascade;
drop table if exists public.motion_custom_behaviors cascade;
drop table if exists public.motion_treatments cascade;
drop table if exists public.motion_refs cascade;
drop table if exists public.music_tracks cascade;   -- its policy goes with it
-- pgvector was only used by the tables above
drop extension if exists vector;

-- v1 version payloads (spec, plan, custom effects, composition code, QA, audio, scenes/script)
alter table public.video_versions
  drop column if exists spec,
  drop column if exists plan,
  drop column if exists custom_js,
  drop column if exists composition_code,
  drop column if exists composition_js,
  drop column if exists treatment,
  drop column if exists energy_map,
  drop column if exists qa,
  drop column if exists audio,
  drop column if exists scenes,
  drop column if exists script;

-- ── 2. Delete test videos ────────────────────────────────────────────
-- wallet_ledger is append-only (trigger) and references renders ON DELETE RESTRICT, so a video whose
-- render was charged/refunded is kept (its money history stays intact). Everything else goes;
-- versions and renders cascade from videos.
delete from public.videos v
where not exists (
  select 1 from public.renders r join public.wallet_ledger l on l.ref_render_id = r.id where r.video_id = v.id
);

-- Script-made "[test] …" workspaces (no members), except any with ledger rows (append-only).
-- Their companies, videos, AI-usage logs and briefs cascade.
delete from public.workspaces w
where w.name like '[test] %'
  and not exists (select 1 from public.workspace_members m where m.workspace_id = w.id)
  and not exists (select 1 from public.wallet_ledger l where l.workspace_id = w.id);

-- ── 3. Videos: v2 objective + form fields ─────────────────────────────
alter table public.videos drop constraint if exists videos_goal_check;
alter table public.videos alter column goal drop not null;
alter table public.videos drop constraint if exists videos_format_check;
alter table public.videos add constraint videos_format_check check (format in ('9:16', '1:1', '4:5', '16:9'));
alter table public.videos drop constraint if exists videos_length_s_check;
alter table public.videos add constraint videos_length_s_check check (length_s in (15, 30, 45, 60, 90));
alter table public.videos drop constraint if exists videos_pace_check;
alter table public.videos alter column pace drop not null;
alter table public.videos
  add column if not exists objective_category text check (objective_category in ('sell', 'launch', 'explain', 'brand', 'social_proof', 'seasonal', 'events', 'hiring')),
  add column if not exists objective          text,
  add column if not exists objective_fields   jsonb not null default '{}'::jsonb,  -- the objective's extra fields (user-supplied facts)
  add column if not exists platform           text check (platform in ('tiktok', 'reels', 'snapchat', 'shorts', 'youtube', 'linkedin', 'x', 'website')),
  add column if not exists tone               text check (tone in ('bold', 'playful', 'premium', 'friendly', 'serious', 'inspiring')),
  add column if not exists key_message        text,
  add column if not exists cta_text           text,
  add column if not exists cta_url            text,
  add column if not exists music_energy       text check (music_energy in ('calm', 'balanced', 'energetic')),
  add column if not exists vo_stability       numeric(3,2) check (vo_stability between 0.3 and 0.6);

-- AI usage: v2 step kinds (old kinds stay valid for history rows).
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('brand_scrape', 'brand_tone', 'brand_facts', 'request_edit',
                  'brief', 'concept', 'script', 'author', 'review',
                  -- v1 history
                  'rewrite_scene', 'director', 'motion_code', 'vision_qa', 'ref_card', 'motion_spec', 'spec_patch', 'illustration'));

-- ── 4. v2 tables ─────────────────────────────────────────────────────
-- Members read their workspace's rows; the engine writes with the service role.
-- Briefs and scripts are also user-editable (editors).

-- Brand brief: real facts only, from the company's own site. Unknown = blank, never invented.
create table if not exists public.brand_briefs (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  tokens          jsonb not null default '{}'::jsonb,   -- colours (with roles), fonts, radii
  logo_urls       jsonb not null default '[]'::jsonb,
  copy_bank       jsonb not null default '[]'::jsonb,   -- real lines from the site
  allowed_claims  text[] not null default '{}',         -- the only claims/numbers a video may show
  not_live        text[] not null default '{}',         -- features announced but not live
  sources         jsonb not null default '[]'::jsonb,   -- pages each fact came from
  edited_by       uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists brand_briefs_company_idx on public.brand_briefs(company_id, created_at desc);

-- One row per engine run of a video (new video or a requested change). Resumable from `step`.
create table if not exists public.video_jobs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  video_id      uuid not null references public.videos(id) on delete cascade,
  kind          text not null default 'new' check (kind in ('new', 'revision')),
  step          text not null default 'brief' check (step in ('brief', 'concept', 'script', 'voice', 'cues', 'music', 'code', 'check', 'sheet', 'review', 'fix', 'render', 'verify', 'done')),
  status        text not null default 'queued' check (status in ('queued', 'running', 'waiting_user', 'done', 'failed')),
  error         text,
  cost_usd      numeric(12,4) not null default 0,
  step_log      jsonb not null default '[]'::jsonb,     -- [{ step, started_at, ms, cost_usd, note }]
  instruction   text,                                   -- revision: the user's change request
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists video_jobs_video_idx on public.video_jobs(video_id, created_at desc);

create table if not exists public.video_concepts (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  video_id         uuid not null references public.videos(id) on delete cascade,
  job_id           uuid references public.video_jobs(id) on delete set null,
  arc              text not null,
  hero_object      text not null,
  story            text not null,
  scene_plan       jsonb not null default '[]'::jsonb,
  techniques       text[] not null default '{}',
  creative_seed    jsonb not null default '{}'::jsonb,  -- sampled arc + techniques
  override_reason  text,                                -- when the Director overrode the seed
  fingerprint      jsonb not null default '{}'::jsonb,
  status           text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected')),
  created_at       timestamptz not null default now()
);
create index if not exists video_concepts_video_idx on public.video_concepts(video_id, created_at desc);

create table if not exists public.video_scripts (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  video_id      uuid not null references public.videos(id) on delete cascade,
  concept_id    uuid references public.video_concepts(id) on delete set null,
  dialect       text not null check (dialect in ('eg', 'sa', 'gulf', 'lev', 'msa', 'en')),
  lines         jsonb not null default '[]'::jsonb,     -- [{ text_with_tags, intent, visual_hint }]
  edited        boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists video_scripts_video_idx on public.video_scripts(video_id, created_at desc);

-- Files and data a run produces. Storage paths live in the `video-assets` bucket:
-- {workspace_id}/{video_id}/… (vo/take{n}.mp3, mix.mp3, stems/…, sheet.jpg, Composition.tsx, video.mp4)
create table if not exists public.video_assets (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  video_id      uuid not null references public.videos(id) on delete cascade,
  job_id        uuid references public.video_jobs(id) on delete set null,
  kind          text not null check (kind in ('vo_take', 'word_timings', 'cue_sheet', 'mix', 'stem', 'composition', 'sheet', 'review', 'mp4')),
  storage_path  text,
  data          jsonb,                                  -- small payloads (timings, cue sheet, review issues)
  meta          jsonb not null default '{}'::jsonb,     -- take n, seed, duration, LUFS, chosen, …
  created_at    timestamptz not null default now()
);
create index if not exists video_assets_video_idx on public.video_assets(video_id, kind, created_at desc);

-- What a finished video looked like — passed to later concepts as an avoid list (never its code/script).
create table if not exists public.video_fingerprints (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  company_id       uuid not null references public.companies(id) on delete cascade,
  video_id         uuid not null unique references public.videos(id) on delete cascade,
  arc              text not null,
  hero_object      text not null,
  top_transitions  text[] not null default '{}',
  palette_usage    text,
  opening_move     text,
  ending_move      text,
  created_at       timestamptz not null default now()
);
create index if not exists video_fingerprints_company_idx on public.video_fingerprints(company_id, created_at desc);
create index if not exists video_fingerprints_workspace_idx on public.video_fingerprints(workspace_id, created_at desc);

-- RLS
alter table public.brand_briefs        enable row level security;
alter table public.video_jobs          enable row level security;
alter table public.video_concepts      enable row level security;
alter table public.video_scripts       enable row level security;
alter table public.video_assets        enable row level security;
alter table public.video_fingerprints  enable row level security;

create policy brand_briefs_select       on public.brand_briefs       for select to authenticated using (public.is_member(workspace_id));
create policy brand_briefs_update       on public.brand_briefs       for update to authenticated using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));
create policy video_jobs_select         on public.video_jobs         for select to authenticated using (public.is_member(workspace_id));
create policy video_concepts_select     on public.video_concepts     for select to authenticated using (public.is_member(workspace_id));
create policy video_scripts_select      on public.video_scripts      for select to authenticated using (public.is_member(workspace_id));
create policy video_scripts_update      on public.video_scripts      for update to authenticated using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));
create policy video_assets_select       on public.video_assets       for select to authenticated using (public.is_member(workspace_id));
create policy video_fingerprints_select on public.video_fingerprints for select to authenticated using (public.is_member(workspace_id));

-- The video page follows job progress live.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'video_jobs') then
    alter publication supabase_realtime add table public.video_jobs;
  end if;
end $$;

-- ── 5. Storage: v2 assets bucket (private; members read, server writes) ──
insert into storage.buckets (id, name, public) values ('video-assets', 'video-assets', false) on conflict (id) do nothing;
create policy video_assets_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'video-assets' and public.is_member(public.storage_path_workspace(name)));

commit;
