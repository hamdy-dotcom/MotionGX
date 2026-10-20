-- =====================================================================
-- MotionGX — 0012_posts.sql (Posts: text + visuals for Facebook, Instagram, TikTok, LinkedIn, X)
-- ADDITIVE ONLY: new tables, nullable columns, widened check constraints, one new function. No data changes.
--   posts / post_versions      — a post and its versions (content: per-platform text + slide images)
--   live_jobs.post_id, kind 'post' — a post is made by a worker job, like a video
--   ai_usage.post_id, kinds post_write / post_design / post_image
--   prices key 'post'           — charged once per post, on the first download (export_post)
--   wallet_ledger.ref_post_id   — the export row of a post (no FK: the ledger is append-only history)
-- =====================================================================

begin;

-- ── 1. Posts ──────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  title         text not null,
  brief         text not null default '',
  type          text not null check (type in ('single', 'carousel', 'text')),
  platforms     text[] not null check (cardinality(platforms) >= 1 and platforms <@ array['facebook', 'instagram', 'tiktok', 'linkedin', 'x']::text[]),
  dialect       text not null check (dialect in ('eg', 'sa', 'gulf', 'lev', 'msa', 'en')),
  ai_image      text not null default 'auto' check (ai_image in ('auto', 'yes', 'no')),
  slides        int check (slides between 2 and 10),            -- carousel: the slide count asked for (null = the writer decides)
  status        text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  generation    jsonb not null default '{}'::jsonb,             -- {stage, mode, error, cost_usd, updated_at}
  exported_at   timestamptz,                                    -- first download (the wallet was charged)
  created_at    timestamptz not null default now()
);
create index if not exists posts_workspace_created_idx on public.posts(workspace_id, created_at desc);
create index if not exists posts_company_idx on public.posts(company_id);

create table if not exists public.post_versions (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references public.posts(id) on delete cascade,
  version         int not null check (version >= 1),
  content         jsonb not null default '{}'::jsonb,           -- {angle, platforms: {<p>: {text, hashtags[], size, slides: [{path, w, h}]}}, slides: [...]}
  origin          text not null default 'generate' check (origin in ('generate', 'change', 'edit_text', 'undo')),
  parent_version  int,
  request         text,                                         -- "Request a change": the client's words
  job_id          uuid,
  cost_usd        numeric(12,5) not null default 0,
  created_at      timestamptz not null default now(),
  unique (post_id, version)
);

create or replace function public.post_workspace(p_post_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.workspace_id from public.posts p where p.id = p_post_id;
$$;

alter table public.posts enable row level security;
alter table public.post_versions enable row level security;
create policy posts_select on public.posts for select to authenticated
  using (public.is_member(workspace_id));
create policy posts_insert on public.posts for insert to authenticated
  with check (public.can_edit(workspace_id) and public.company_workspace(company_id) = workspace_id);
create policy posts_update on public.posts for update to authenticated
  using (public.can_edit(workspace_id))
  with check (public.can_edit(workspace_id) and public.company_workspace(company_id) = workspace_id);
create policy posts_delete on public.posts for delete to authenticated
  using (public.can_edit(workspace_id));
create policy post_versions_select on public.post_versions for select to authenticated
  using (public.is_member(public.post_workspace(post_id)));
create policy post_versions_insert on public.post_versions for insert to authenticated
  with check (public.can_edit(public.post_workspace(post_id)));

-- ── 2. Worker jobs for posts ──────────────────────────────────────────────────────────────────────
alter table public.live_jobs add column if not exists post_id uuid references public.posts(id) on delete cascade;
create index if not exists live_jobs_post_idx on public.live_jobs(post_id, created_at desc);
alter table public.live_jobs drop constraint if exists live_jobs_kind_check;
alter table public.live_jobs add constraint live_jobs_kind_check check (kind in ('capture', 'video', 'post'));

-- ── 3. AI usage ───────────────────────────────────────────────────────────────────────────────────
alter table public.ai_usage add column if not exists post_id uuid references public.posts(id) on delete set null;
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('brand_scrape', 'brand_tone', 'brand_facts', 'request_edit',
                  'brief', 'concept', 'script', 'author', 'review',
                  'rewrite_scene', 'director', 'motion_code', 'vision_qa', 'ref_card', 'motion_spec', 'spec_patch', 'illustration',
                  'live_capture', 'live_profile', 'live_script', 'live_build', 'live_qa', 'live_repair',
                  'live_direct', 'director_agent',
                  'post_write', 'post_design', 'post_image'));

-- ── 4. Price and the export charge ────────────────────────────────────────────────────────────────
alter table public.prices drop constraint if exists prices_key_check;
alter table public.prices add constraint prices_key_check check (key in ('video_min', 'voiceover_min', 'post'));
insert into public.prices (key, usd, active_from)
  select 'post', 0.50, '2026-01-01T00:00:00Z' where not exists (select 1 from public.prices where key = 'post');

alter table public.wallet_ledger add column if not exists ref_post_id uuid;
alter table public.wallet_ledger drop constraint if exists wallet_ledger_check;
alter table public.wallet_ledger add constraint wallet_ledger_check check (
  (kind = 'topup'  and amount_usd > 0) or
  (kind = 'export' and amount_usd < 0 and (ref_render_id is not null or ref_post_id is not null)) or
  (kind = 'refund' and amount_usd > 0 and ref_render_id is not null) or
  (kind = 'adjustment')
);
create unique index if not exists wallet_ledger_one_export_per_post on public.wallet_ledger(ref_post_id) where kind = 'export';

-- The first download of a post charges the wallet once (the current 'post' price); later downloads are free.
-- Returns {charged, cost_usd}. Raises 'insufficient_balance' like charge_export.
create or replace function public.export_post(p_post_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_post  public.posts%rowtype;
  v_ws    public.workspaces%rowtype;
  v_cost  numeric(12,4);
  v_fx    numeric;
begin
  select * into v_post from public.posts where id = p_post_id;
  if not found or not public.can_edit(v_post.workspace_id) then
    raise exception 'post not found';
  end if;
  if not exists (select 1 from public.post_versions where post_id = p_post_id) then
    raise exception 'post has no version yet';
  end if;
  if exists (select 1 from public.wallet_ledger l where l.ref_post_id = p_post_id and l.kind = 'export') then
    return jsonb_build_object('charged', false, 'cost_usd', 0);
  end if;

  select * into v_ws from public.workspaces where id = v_post.workspace_id for update;
  v_cost := round(coalesce(public.current_price('post'), 0), 4);
  if v_cost > 0 then
    if v_ws.wallet_balance_usd < v_cost then
      raise exception 'insufficient_balance' using hint = format('need %s USD, have %s USD', v_cost, v_ws.wallet_balance_usd);
    end if;
    v_fx := coalesce(public.latest_fx_rate(v_ws.currency_code), case when v_ws.currency_code = 'USD' then 1 end);
    insert into public.wallet_ledger (workspace_id, kind, amount_usd, amount_local, currency_code, fx_rate, ref_post_id, note)
    values (v_ws.id, 'export', -v_cost, round(-v_cost * v_fx, 2), v_ws.currency_code, v_fx, p_post_id, v_post.title);
  end if;
  update public.posts set exported_at = now() where id = p_post_id;
  return jsonb_build_object('charged', v_cost > 0, 'cost_usd', v_cost);
end;
$$;
revoke execute on function public.export_post(uuid) from public, anon;
grant  execute on function public.export_post(uuid) to authenticated;

commit;
