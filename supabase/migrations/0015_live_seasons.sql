-- =====================================================================
-- MotionGX — 0015_live_seasons.sql (the seasons calendar, checked and extended by a daily web search)
-- ADDITIVE ONLY: two new tables and a widened check constraint. No data changes.
--   season_updates   — what the daily search found per country: a season's date confirmed, moved or cancelled (with
--                      its source), or a new season added. Server-written, read by every member (it isn't private).
--   season_checks    — one row per country and day: the check ran (or is running), so it runs once a day
--   ai_usage kind 'season_check'
-- =====================================================================

begin;

create table if not exists public.season_updates (
  id            uuid primary key default gen_random_uuid(),
  season_key    text not null,                      -- a calendar id ('sa-national-2027'), or 'live:<country>:<slug>' for an added one
  country       text not null,                      -- the country it was checked for ('SA')
  action        text not null check (action in ('confirm', 'move', 'cancel', 'add')),
  from_day      date,
  to_day        date,
  data          jsonb not null default '{}'::jsonb, -- add: {name: {ar, en}, kind, industries[], angle: {ar, en}}; move/confirm: {note}
  source_url    text,
  source_title  text,
  checked_on    date not null,
  created_at    timestamptz not null default now(),
  unique (season_key, country)
);
create index if not exists season_updates_country_idx on public.season_updates(country, from_day);
alter table public.season_updates enable row level security;
create policy season_updates_select on public.season_updates for select to authenticated using (true);

create table if not exists public.season_checks (
  country     text not null,
  day         date not null,
  status      text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  summary     jsonb not null default '{}'::jsonb,   -- {confirmed, moved, cancelled, added}
  created_at  timestamptz not null default now(),
  primary key (country, day)
);
alter table public.season_checks enable row level security;
create policy season_checks_select on public.season_checks for select to authenticated using (true);

alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('brand_scrape', 'brand_tone', 'brand_facts', 'request_edit',
                  'brief', 'concept', 'script', 'author', 'review',
                  'rewrite_scene', 'director', 'motion_code', 'vision_qa', 'ref_card', 'motion_spec', 'spec_patch', 'illustration',
                  'live_capture', 'live_profile', 'live_script', 'live_build', 'live_qa', 'live_repair',
                  'live_direct', 'director_agent',
                  'post_write', 'post_design', 'post_image',
                  'content_plan', 'trends', 'notice_draft', 'season_check'));

commit;
