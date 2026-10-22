-- =====================================================================
-- MotionGX — 0014_brand_market_notices.sql (where a brand works, its industry, the studio's nudges)
-- ADDITIVE ONLY: new nullable/defaulted columns, new tables, a widened check constraint. No data changes.
--   companies.industry / countries / socials — the brand's industry, the countries it operates in, its social pages
--   videos.content_type / posts.content_type — what a piece is ('standard', 'product_update', 'story', …)
--   videos.refs / posts.refs                 — the reference media and links the client attached when creating it
--   industry_trends                          — the day's trending topics per industry + region (shared, server-written)
--   notice_states                            — a member's answers to the studio's pop-ups (later / not for me / done)
--   ai_usage kinds 'trends', 'notice_draft'  — the daily trend search, and drafting an idea from a pop-up
-- Reference files go to the existing brand-assets bucket: {workspace}/{company}/refs/…
-- =====================================================================

begin;

-- ── 1. The brand's market ─────────────────────────────────────────────────────────────────────────
alter table public.companies add column if not exists industry text;
alter table public.companies add column if not exists countries text[] not null default '{}'::text[];
alter table public.companies add column if not exists socials jsonb not null default '{}'::jsonb;   -- {instagram, facebook, tiktok, linkedin, x, youtube, snapchat}: profile URLs

-- ── 2. What a piece is, and what the client gave as reference ─────────────────────────────────────
alter table public.videos add column if not exists content_type text not null default 'standard';
alter table public.posts add column if not exists content_type text not null default 'standard';
alter table public.videos add column if not exists refs jsonb not null default '[]'::jsonb;        -- [{kind: image|video|link|file, path?, url?, name, note?}]
alter table public.posts add column if not exists refs jsonb not null default '[]'::jsonb;

-- ── 3. Trends: one row per industry + region + day, written by the server, read by members ────────
create table if not exists public.industry_trends (
  id          uuid primary key default gen_random_uuid(),
  industry    text not null,
  region      text not null,                         -- the brand's countries, sorted, comma-joined ('AE,SA')
  day         date not null,
  items       jsonb not null default '[]'::jsonb,    -- [{id, title, why, angle, sources: [{title, url}]}]
  status      text not null default 'ready' check (status in ('pending', 'ready', 'failed')),
  created_at  timestamptz not null default now(),
  unique (industry, region, day)
);
alter table public.industry_trends enable row level security;
create policy industry_trends_select on public.industry_trends for select to authenticated using (true);

-- ── 4. Pop-up answers: per member, per brand, per notice ──────────────────────────────────────────
create table if not exists public.notice_states (
  user_id       uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  key           text not null,                       -- 'season:eg-labour-day-2027', 'trend:2026-10-22:3', 'schedule:unscheduled'
  status        text not null check (status in ('later', 'dismissed', 'acted')),
  until         timestamptz,                         -- 'later': hidden until then
  updated_at    timestamptz not null default now(),
  primary key (user_id, company_id, key)
);
alter table public.notice_states enable row level security;
create policy notice_states_select on public.notice_states for select to authenticated using (user_id = auth.uid() and public.is_member(workspace_id));
create policy notice_states_insert on public.notice_states for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(workspace_id) and public.company_workspace(company_id) = workspace_id);
create policy notice_states_update on public.notice_states for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member(workspace_id) and public.company_workspace(company_id) = workspace_id);
create policy notice_states_delete on public.notice_states for delete to authenticated using (user_id = auth.uid());

-- ── 5. AI usage ───────────────────────────────────────────────────────────────────────────────────
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('brand_scrape', 'brand_tone', 'brand_facts', 'request_edit',
                  'brief', 'concept', 'script', 'author', 'review',
                  'rewrite_scene', 'director', 'motion_code', 'vision_qa', 'ref_card', 'motion_spec', 'spec_patch', 'illustration',
                  'live_capture', 'live_profile', 'live_script', 'live_build', 'live_qa', 'live_repair',
                  'live_direct', 'director_agent',
                  'post_write', 'post_design', 'post_image',
                  'content_plan', 'trends', 'notice_draft'));

commit;
