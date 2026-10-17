-- =====================================================================
-- MotionGX — 0008_live_engine.sql (live engine: real product UI → GSAP composition → MP4)
-- Run after 0007_v2_engine.sql (already applied). ADDITIVE ONLY: nullable columns with
-- `if not exists`, new tables, a new bucket. No data is dropped or renamed.
-- =====================================================================

begin;

-- ── 1. Restore the columns 0007 dropped (the studio UI and the legacy engine read them) ──────────
alter table public.videos
  add column if not exists generation      jsonb default '{}'::jsonb,   -- {stage, mode, updated_at, …}; replaced on every write
  add column if not exists music_enabled   boolean default true,
  add column if not exists music_mood      text,
  add column if not exists music_track_id  uuid;                       -- music_tracks is gone: no FK

alter table public.video_versions
  add column if not exists scenes            jsonb default '[]'::jsonb,
  add column if not exists script            jsonb default '{}'::jsonb,
  add column if not exists spec              jsonb,
  add column if not exists plan              jsonb,
  add column if not exists custom_js         jsonb,
  add column if not exists composition_code  text,
  add column if not exists composition_js    text,
  add column if not exists treatment         jsonb,
  add column if not exists energy_map        jsonb,
  add column if not exists qa                jsonb,
  add column if not exists audio             jsonb;

-- ── 2. Live engine: per-version fields ────────────────────────────────────────────────────────────
alter table public.video_versions
  add column if not exists engine            text default 'legacy',   -- 'legacy' | 'live'
  add column if not exists composition_path  text,                    -- live-engine/{ws}/runs/{video}/{job}/video.src.html
  add column if not exists mp4_path          text,                    -- …/video.mp4 (preview + export source)
  add column if not exists live_script       jsonb,                   -- the run's script.json
  add column if not exists live_qa           jsonb,                   -- the run's qa.json
  add column if not exists live_job_id       uuid;

-- ── 3. Brand captures — one-time per company, reused by every video; also the capture log ────────
create table if not exists public.live_brand_captures (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  company_id      uuid not null references public.companies(id) on delete cascade,
  version         int not null default 4,
  domain          text,                        -- registrable domain the agent was allowed on
  site_url        text,
  identity_email  text,                        -- the test identity it signed up with (never the password)
  status          text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  app_status      text,                        -- sandbox: done | blocked | step_limit | error | no_app_link | skipped
  steps           int,                         -- agent turns used
  pages           int,
  app_screens     int,
  manifest        jsonb,                       -- capture.json
  profile         jsonb,                       -- brand.json
  storage_prefix  text,                        -- live-engine/{ws}/brands/{company}/{capture}
  cost_usd        numeric(12,5) not null default 0,
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists live_brand_captures_company_idx on public.live_brand_captures(company_id, created_at desc);

-- ── 4. Jobs — one per worker run (capture job or video job); resumable step by step ──────────────
create table if not exists public.live_jobs (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  video_id        uuid references public.videos(id) on delete cascade,     -- the video that triggered it (a capture job serves every video of the company)
  company_id      uuid not null references public.companies(id) on delete cascade,
  capture_id      uuid references public.live_brand_captures(id) on delete set null,
  kind            text not null check (kind in ('capture', 'video')),
  mode            text,                                                    -- new | direction | lines | edit
  input           jsonb not null default '{}'::jsonb,                      -- brief / edited lines / change request
  status          text not null default 'queued' check (status in ('queued', 'running', 'waiting_code', 'done', 'failed')),
  stage           text,
  done_steps      text[] not null default '{}',                            -- finished steps (resume skips them)
  ask             jsonb,                                                   -- SMS code: {sent_to, asked_at, answer, answered_at}
  log             jsonb not null default '[]'::jsonb,
  ledger          jsonb not null default '[]'::jsonb,                      -- cost rows: {step, model, in, out, cacheRead, usd, ms}
  cost_usd        numeric(12,5) not null default 0,
  runner          text,                                                    -- local | sandbox
  sandbox_id      text,
  attempts        int not null default 0,
  token_hash      text,                                                    -- sha256 of the worker's callback token
  error           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists live_jobs_video_idx on public.live_jobs(video_id, created_at desc);
create index if not exists live_jobs_company_idx on public.live_jobs(company_id, created_at desc);

alter table public.live_brand_captures enable row level security;
alter table public.live_jobs enable row level security;
create policy live_brand_captures_select on public.live_brand_captures for select to authenticated using (public.is_member(workspace_id));
create policy live_jobs_select on public.live_jobs for select to authenticated using (public.is_member(workspace_id));
-- all writes: service role (the worker callback route)

-- ── 5. AI usage kinds: same list as 0007 + the live steps (a check constraint can only be widened
--      by replacing it; no rows change) ────────────────────────────────────────────────────────────
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('brand_scrape', 'brand_tone', 'brand_facts', 'request_edit',
                  'brief', 'concept', 'script', 'author', 'review',
                  'rewrite_scene', 'director', 'motion_code', 'vision_qa', 'ref_card', 'motion_spec', 'spec_patch', 'illustration',
                  'live_capture', 'live_profile', 'live_script', 'live_build', 'live_qa', 'live_repair'));

-- ── 6. Storage: private bucket for captures and runs (members read their workspace; server writes).
--      Paths: {workspace}/brands/{company}/{capture}/…, {workspace}/runs/{video}/{job}/…
--      The saved login (auth.json) lives under _private/{workspace}/… — the first segment isn't a
--      workspace uuid, so no member policy matches it: service role only. ──────────────────────────
insert into storage.buckets (id, name, public) values ('live-engine', 'live-engine', false) on conflict (id) do nothing;
create policy live_engine_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'live-engine' and public.is_member(public.storage_path_workspace(name)));

commit;
