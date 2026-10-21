-- =====================================================================
-- MotionGX — 0013_plans_calendar.sql (the brand calendar and content plans)
-- ADDITIVE ONLY: new tables, nullable columns, a widened check constraint. No data changes.
--   videos.scheduled_on / posts.scheduled_on — the day a piece is for on the brand calendar
--   content_plans                            — a period, a rhythm, goals, a mix and notes for one brand
--   plan_ideas                               — the ideas suggested for a plan; accepted ones get a day and, once made, a video or post
--   ai_usage kind 'content_plan'             — the call that writes a plan's ideas
-- =====================================================================

begin;

-- ── 1. The day a piece is for ─────────────────────────────────────────────────────────────────────
alter table public.videos add column if not exists scheduled_on date;
alter table public.posts add column if not exists scheduled_on date;
create index if not exists videos_company_scheduled_idx on public.videos(company_id, scheduled_on);
create index if not exists posts_company_scheduled_idx on public.posts(company_id, scheduled_on);

-- ── 2. Plans ──────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.content_plans (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  starts_on     date not null,
  ends_on       date not null check (ends_on >= starts_on and ends_on - starts_on <= 92),
  per_week      int not null default 4 check (per_week between 1 and 7),
  goals         text[] not null default '{}'::text[] check (goals <@ array['sales', 'awareness', 'launch', 'community', 'season']::text[]),
  mix           text[] not null default array['image', 'carousel', 'video']::text[] check (cardinality(mix) >= 1 and mix <@ array['image', 'carousel', 'video', 'text']::text[]),
  platforms     text[] not null default array['instagram', 'facebook']::text[] check (platforms <@ array['facebook', 'instagram', 'tiktok', 'linkedin', 'x']::text[]),
  notes         text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists content_plans_company_idx on public.content_plans(company_id, created_at desc);

create table if not exists public.plan_ideas (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references public.content_plans(id) on delete cascade,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  position      int not null default 0,
  kind          text not null check (kind in ('image', 'carousel', 'video', 'text')),
  angle         text not null default '',
  title         text not null,
  why           text not null default '',
  hook          text not null default '',          -- how the caption opens
  platforms     text[] not null default '{}'::text[],
  occasion      text,                              -- e.g. "آخر الشهر"; with suggested_on, the day it belongs to
  suggested_on  date,
  status        text not null default 'new' check (status in ('new', 'ok', 'no', 'made')),
  scheduled_on  date,
  video_id      uuid references public.videos(id) on delete set null,
  post_id       uuid references public.posts(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists plan_ideas_plan_idx on public.plan_ideas(plan_id, position);
create index if not exists plan_ideas_company_scheduled_idx on public.plan_ideas(company_id, scheduled_on) where scheduled_on is not null;

alter table public.content_plans enable row level security;
alter table public.plan_ideas enable row level security;
create policy content_plans_select on public.content_plans for select to authenticated using (public.is_member(workspace_id));
create policy content_plans_insert on public.content_plans for insert to authenticated
  with check (public.can_edit(workspace_id) and public.company_workspace(company_id) = workspace_id);
create policy content_plans_update on public.content_plans for update to authenticated
  using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id) and public.company_workspace(company_id) = workspace_id);
create policy content_plans_delete on public.content_plans for delete to authenticated using (public.can_edit(workspace_id));
create policy plan_ideas_select on public.plan_ideas for select to authenticated using (public.is_member(workspace_id));
create policy plan_ideas_insert on public.plan_ideas for insert to authenticated
  with check (public.can_edit(workspace_id) and public.company_workspace(company_id) = workspace_id);
create policy plan_ideas_update on public.plan_ideas for update to authenticated
  using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id) and public.company_workspace(company_id) = workspace_id);
create policy plan_ideas_delete on public.plan_ideas for delete to authenticated using (public.can_edit(workspace_id));

-- ── 3. AI usage ───────────────────────────────────────────────────────────────────────────────────
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('brand_scrape', 'brand_tone', 'brand_facts', 'request_edit',
                  'brief', 'concept', 'script', 'author', 'review',
                  'rewrite_scene', 'director', 'motion_code', 'vision_qa', 'ref_card', 'motion_spec', 'spec_patch', 'illustration',
                  'live_capture', 'live_profile', 'live_script', 'live_build', 'live_qa', 'live_repair',
                  'live_direct', 'director_agent',
                  'post_write', 'post_design', 'post_image',
                  'content_plan'));

commit;
