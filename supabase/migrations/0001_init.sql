-- =====================================================================
-- MotionGX — 0001_init.sql (Phase 1)
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  locale      text not null default 'ar' check (locale in ('ar', 'en')),
  created_at  timestamptz not null default now()
);

create table public.workspaces (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  country_code        text not null default 'EG' check (country_code ~ '^[A-Z]{2}$'),
  currency_code       text not null default 'EGP' check (currency_code ~ '^[A-Z]{3}$'),
  wallet_balance_usd  numeric(12,4) not null default 0 check (wallet_balance_usd >= 0),
  monthly_cap_usd     numeric(12,4) check (monthly_cap_usd is null or monthly_cap_usd >= 0),
  created_at          timestamptz not null default now()
);

create table public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'editor' check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members(user_id);

create table public.companies (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  name             text not null,
  website_url      text,
  default_dialect  text not null default 'eg' check (default_dialect in ('eg', 'sa', 'gulf', 'lev', 'msa', 'en')),
  created_at       timestamptz not null default now()
);
create index companies_workspace_idx on public.companies(workspace_id);

create table public.brand_profiles (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null unique references public.companies(id) on delete cascade,
  colors      jsonb not null default '[]'::jsonb,
  fonts       jsonb not null default '{}'::jsonb,
  tone        text,
  tagline     text,
  raw         jsonb,
  created_at  timestamptz not null default now()
);

create table public.brand_assets (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  kind          text not null check (kind in ('logo', 'image', 'font')),
  storage_path  text not null,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index brand_assets_company_idx on public.brand_assets(company_id);

create table public.voices (
  id                 uuid primary key default gen_random_uuid(),
  provider           text not null check (provider in ('elevenlabs', 'azure')),
  provider_voice_id  text not null,
  display_name       text not null,
  dialect            text not null check (dialect in ('eg', 'sa', 'gulf', 'lev', 'msa', 'en')),
  gender             text not null check (gender in ('female', 'male')),
  is_active          boolean not null default true,
  created_at         timestamptz not null default now()
);
create index voices_dialect_idx on public.voices(dialect) where is_active;

create table public.videos (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  title         text not null,
  brief         text not null default '',
  goal          text not null check (goal in ('sell', 'launch', 'offer', 'about', 'hiring', 'occasion')),
  format        text not null check (format in ('9:16', '1:1', '16:9')),
  length_s      int  not null check (length_s in (15, 30, 60)),
  pace          text not null check (pace in ('calm', 'medium', 'fast')),
  dialect       text not null check (dialect in ('eg', 'sa', 'gulf', 'lev', 'msa', 'en')),
  voiceover     boolean not null default false,
  voice_id      uuid references public.voices(id) on delete set null,
  status        text not null default 'draft' check (status in ('draft', 'ready', 'review', 'exporting', 'failed')),
  created_at    timestamptz not null default now(),
  check (not voiceover or voice_id is not null)
);
create index videos_workspace_created_idx on public.videos(workspace_id, created_at desc);
create index videos_company_idx on public.videos(company_id);

create table public.video_versions (
  id          uuid primary key default gen_random_uuid(),
  video_id    uuid not null references public.videos(id) on delete cascade,
  version     int  not null check (version >= 1),
  scenes      jsonb not null default '[]'::jsonb,
  script      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (video_id, version)
);

create table public.renders (
  id              uuid primary key default gen_random_uuid(),
  video_id        uuid not null references public.videos(id) on delete cascade,
  version_id      uuid not null references public.video_versions(id) on delete restrict,
  status          text not null default 'queued' check (status in ('queued', 'rendering', 'done', 'failed')),
  billed_seconds  int,
  cost_usd        numeric(12,4),
  output_path     text,
  error           text,
  created_at      timestamptz not null default now()
);
create index renders_video_idx on public.renders(video_id, created_at desc);

-- Append-only money ledger. amount_usd is signed: + credits, - debits.
create table public.wallet_ledger (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete restrict,
  kind           text not null check (kind in ('topup', 'export', 'refund', 'adjustment')),
  amount_usd     numeric(12,4) not null check (amount_usd <> 0),
  amount_local   numeric(14,2),
  currency_code  text check (currency_code ~ '^[A-Z]{3}$'),
  fx_rate        numeric(14,6),
  ref_render_id  uuid references public.renders(id) on delete restrict,
  note           text,
  created_at     timestamptz not null default now(),
  check (
    (kind = 'topup'  and amount_usd > 0) or
    (kind = 'export' and amount_usd < 0 and ref_render_id is not null) or
    (kind = 'refund' and amount_usd > 0 and ref_render_id is not null) or
    (kind = 'adjustment')
  )
);
create index wallet_ledger_workspace_created_idx on public.wallet_ledger(workspace_id, created_at desc);
-- A render can be charged once and refunded once.
create unique index wallet_ledger_one_export_per_render on public.wallet_ledger(ref_render_id) where kind = 'export';
create unique index wallet_ledger_one_refund_per_render on public.wallet_ledger(ref_render_id) where kind = 'refund';

create table public.prices (
  id           uuid primary key default gen_random_uuid(),
  key          text not null check (key in ('video_min', 'voiceover_min')),
  usd          numeric(12,4) not null check (usd >= 0),
  active_from  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (key, active_from)
);

create table public.fx_rates (
  id             uuid primary key default gen_random_uuid(),
  currency_code  text not null check (currency_code ~ '^[A-Z]{3}$'),
  usd_rate       numeric(14,6) not null check (usd_rate > 0),  -- local units per 1 USD
  rate_date      date not null default current_date,
  created_at     timestamptz not null default now(),
  unique (currency_code, rate_date)
);

-- ---------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------

create or replace function public.is_member(p_workspace_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_role(p_workspace_id uuid, p_roles text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace_id and m.user_id = auth.uid() and m.role = any (p_roles)
  );
$$;

-- owner / admin / editor can write; viewer is read-only.
create or replace function public.can_edit(p_workspace_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.has_role(p_workspace_id, array['owner', 'admin', 'editor']);
$$;

create or replace function public.company_workspace(p_company_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select c.workspace_id from public.companies c where c.id = p_company_id;
$$;

create or replace function public.video_workspace(p_video_id uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select v.workspace_id from public.videos v where v.id = p_video_id;
$$;

create or replace function public.shares_workspace(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members a
    join public.workspace_members b on b.workspace_id = a.workspace_id
    where a.user_id = auth.uid() and b.user_id = p_user_id
  );
$$;

create or replace function public.current_price(p_key text)
returns numeric
language sql stable set search_path = ''
as $$
  select p.usd from public.prices p
  where p.key = p_key and p.active_from <= now()
  order by p.active_from desc
  limit 1;
$$;

create or replace function public.latest_fx_rate(p_currency text)
returns numeric
language sql stable set search_path = ''
as $$
  select f.usd_rate from public.fx_rates f
  where f.currency_code = p_currency and f.rate_date <= current_date
  order by f.rate_date desc
  limit 1;
$$;

-- ---------------------------------------------------------------------
-- Wallet: balance is maintained ONLY by this trigger.
-- ---------------------------------------------------------------------

create or replace function public.apply_ledger_entry()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.workspaces
     set wallet_balance_usd = wallet_balance_usd + new.amount_usd
   where id = new.workspace_id;
  return null;
end;
$$;

create trigger wallet_ledger_apply
after insert on public.wallet_ledger
for each row execute function public.apply_ledger_entry();

create or replace function public.ledger_is_append_only()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'wallet_ledger is append-only';
end;
$$;

create trigger wallet_ledger_no_update_delete
before update or delete on public.wallet_ledger
for each row execute function public.ledger_is_append_only();

create trigger wallet_ledger_no_truncate
before truncate on public.wallet_ledger
for each statement execute function public.ledger_is_append_only();

-- ---------------------------------------------------------------------
-- First login: create workspace + owner membership.
-- Called from a server action (NOT a trigger on auth.users).
-- Idempotent. The very first user to sign in claims the seeded demo
-- workspace (with the منتوج company and demo top-up); everyone after
-- that gets a fresh, empty workspace.
-- ---------------------------------------------------------------------

create or replace function public.bootstrap_workspace(
  p_name text,
  p_country_code text default 'EG',
  p_currency_code text default 'EGP'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_ws   uuid;
  v_demo constant uuid := '00000000-0000-0000-0000-00000000d3e0';
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select m.workspace_id into v_ws
  from public.workspace_members m
  where m.user_id = v_uid
  order by m.created_at
  limit 1;
  if v_ws is not null then
    return v_ws;
  end if;

  -- Claim the demo workspace if nobody owns it yet.
  perform 1 from public.workspaces w where w.id = v_demo for update;
  if found and not exists (select 1 from public.workspace_members m where m.workspace_id = v_demo) then
    insert into public.workspace_members (workspace_id, user_id, role) values (v_demo, v_uid, 'owner');
    return v_demo;
  end if;

  insert into public.workspaces (name, country_code, currency_code)
  values (coalesce(nullif(trim(p_name), ''), 'Workspace'), p_country_code, p_currency_code)
  returning id into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_uid, 'owner');
  return v_ws;
end;
$$;

-- ---------------------------------------------------------------------
-- Export billing.
-- export_video(video_id): inserts the render row and charges the wallet
-- in ONE transaction (via charge_export). Refuses on insufficient balance.
-- Billed per second, rounded up to 5 s. Prices come from `prices`.
-- ---------------------------------------------------------------------

create or replace function public.charge_export(p_render_id uuid)
returns numeric
language plpgsql security definer set search_path = ''
as $$
declare
  v_render    public.renders%rowtype;
  v_video     public.videos%rowtype;
  v_ws        public.workspaces%rowtype;
  v_seconds   int;
  v_rate_usd  numeric;
  v_cost      numeric(12,4);
  v_fx        numeric;
begin
  select * into v_render from public.renders where id = p_render_id;
  if not found then
    raise exception 'render not found';
  end if;

  select * into v_video from public.videos where id = v_render.video_id;

  if auth.role() <> 'service_role' and not public.can_edit(v_video.workspace_id) then
    raise exception 'not allowed';
  end if;

  if exists (select 1 from public.wallet_ledger l where l.ref_render_id = p_render_id and l.kind = 'export') then
    raise exception 'render already charged';
  end if;

  -- Lock the wallet row so concurrent exports can't overdraw it.
  select * into v_ws from public.workspaces where id = v_video.workspace_id for update;

  v_seconds  := (ceil(v_video.length_s / 5.0) * 5)::int;
  v_rate_usd := public.current_price('video_min')
              + case when v_video.voiceover then public.current_price('voiceover_min') else 0 end;
  if v_rate_usd is null then
    raise exception 'prices not configured';
  end if;
  v_cost := round(v_seconds / 60.0 * v_rate_usd, 4);

  if v_ws.wallet_balance_usd < v_cost then
    raise exception 'insufficient_balance' using hint = format('need %s USD, have %s USD', v_cost, v_ws.wallet_balance_usd);
  end if;

  v_fx := coalesce(public.latest_fx_rate(v_ws.currency_code), case when v_ws.currency_code = 'USD' then 1 end);

  update public.renders
     set billed_seconds = v_seconds, cost_usd = v_cost
   where id = p_render_id;

  insert into public.wallet_ledger (workspace_id, kind, amount_usd, amount_local, currency_code, fx_rate, ref_render_id, note)
  values (v_ws.id, 'export', -v_cost, round(-v_cost * v_fx, 2), v_ws.currency_code, v_fx, p_render_id, v_video.title);

  return v_cost;
end;
$$;

create or replace function public.export_video(p_video_id uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_video    public.videos%rowtype;
  v_version  uuid;
  v_render   uuid;
begin
  select * into v_video from public.videos where id = p_video_id;
  if not found or not public.can_edit(v_video.workspace_id) then
    raise exception 'video not found';
  end if;

  select vv.id into v_version
  from public.video_versions vv
  where vv.video_id = p_video_id
  order by vv.version desc
  limit 1;
  if v_version is null then
    raise exception 'video has no script yet';
  end if;

  insert into public.renders (video_id, version_id, status)
  values (p_video_id, v_version, 'queued')
  returning id into v_render;

  perform public.charge_export(v_render);

  update public.videos set status = 'exporting' where id = p_video_id;
  return v_render;
end;
$$;

-- PHASE 3: called by the renderer (service role) when an export fails.
create or replace function public.refund_render(p_render_id uuid, p_error text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_charge public.wallet_ledger%rowtype;
begin
  select * into v_charge from public.wallet_ledger
  where ref_render_id = p_render_id and kind = 'export';
  if not found then
    raise exception 'render was never charged';
  end if;

  update public.renders set status = 'failed', error = p_error where id = p_render_id;
  update public.videos v set status = 'failed'
    from public.renders r where r.id = p_render_id and v.id = r.video_id;

  insert into public.wallet_ledger (workspace_id, kind, amount_usd, amount_local, currency_code, fx_rate, ref_render_id, note)
  values (v_charge.workspace_id, 'refund', -v_charge.amount_usd, -v_charge.amount_local,
          v_charge.currency_code, v_charge.fx_rate, p_render_id, 'Auto-refund: export failed');
end;
$$;

-- Function privileges
revoke execute on function public.apply_ledger_entry()                 from public, anon, authenticated;
revoke execute on function public.ledger_is_append_only()              from public, anon, authenticated;
revoke execute on function public.charge_export(uuid)                  from public, anon, authenticated;
revoke execute on function public.refund_render(uuid, text)            from public, anon, authenticated;
revoke execute on function public.bootstrap_workspace(text, text, text) from public, anon;
revoke execute on function public.export_video(uuid)                   from public, anon;
grant  execute on function public.bootstrap_workspace(text, text, text) to authenticated;
grant  execute on function public.export_video(uuid)                   to authenticated;
grant  execute on function public.charge_export(uuid)                  to service_role;
grant  execute on function public.refund_render(uuid, text)            to service_role;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.companies         enable row level security;
alter table public.brand_profiles    enable row level security;
alter table public.brand_assets      enable row level security;
alter table public.voices            enable row level security;
alter table public.videos            enable row level security;
alter table public.video_versions    enable row level security;
alter table public.renders           enable row level security;
alter table public.wallet_ledger     enable row level security;
alter table public.prices            enable row level security;
alter table public.fx_rates          enable row level security;

-- profiles: own row, plus read co-members.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace(id));
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- workspaces: members read; owner/admin edit settings (never the balance — see grants below).
create policy workspaces_select on public.workspaces for select to authenticated
  using (public.is_member(id));
create policy workspaces_update on public.workspaces for update to authenticated
  using (public.has_role(id, array['owner', 'admin']))
  with check (public.has_role(id, array['owner', 'admin']));

-- workspace_members: members read; owners manage.
create policy members_select on public.workspace_members for select to authenticated
  using (public.is_member(workspace_id));
create policy members_insert on public.workspace_members for insert to authenticated
  with check (public.has_role(workspace_id, array['owner']));
create policy members_update on public.workspace_members for update to authenticated
  using (public.has_role(workspace_id, array['owner']))
  with check (public.has_role(workspace_id, array['owner']));
create policy members_delete on public.workspace_members for delete to authenticated
  using (public.has_role(workspace_id, array['owner']));

-- companies
create policy companies_select on public.companies for select to authenticated
  using (public.is_member(workspace_id));
create policy companies_insert on public.companies for insert to authenticated
  with check (public.can_edit(workspace_id));
create policy companies_update on public.companies for update to authenticated
  using (public.can_edit(workspace_id)) with check (public.can_edit(workspace_id));
create policy companies_delete on public.companies for delete to authenticated
  using (public.can_edit(workspace_id));

-- brand_profiles
create policy brand_profiles_select on public.brand_profiles for select to authenticated
  using (public.is_member(public.company_workspace(company_id)));
create policy brand_profiles_insert on public.brand_profiles for insert to authenticated
  with check (public.can_edit(public.company_workspace(company_id)));
create policy brand_profiles_update on public.brand_profiles for update to authenticated
  using (public.can_edit(public.company_workspace(company_id)))
  with check (public.can_edit(public.company_workspace(company_id)));
create policy brand_profiles_delete on public.brand_profiles for delete to authenticated
  using (public.can_edit(public.company_workspace(company_id)));

-- brand_assets
create policy brand_assets_select on public.brand_assets for select to authenticated
  using (public.is_member(public.company_workspace(company_id)));
create policy brand_assets_insert on public.brand_assets for insert to authenticated
  with check (public.can_edit(public.company_workspace(company_id)));
create policy brand_assets_update on public.brand_assets for update to authenticated
  using (public.can_edit(public.company_workspace(company_id)))
  with check (public.can_edit(public.company_workspace(company_id)));
create policy brand_assets_delete on public.brand_assets for delete to authenticated
  using (public.can_edit(public.company_workspace(company_id)));

-- videos (company must belong to the same workspace)
create policy videos_select on public.videos for select to authenticated
  using (public.is_member(workspace_id));
create policy videos_insert on public.videos for insert to authenticated
  with check (public.can_edit(workspace_id) and public.company_workspace(company_id) = workspace_id);
create policy videos_update on public.videos for update to authenticated
  using (public.can_edit(workspace_id))
  with check (public.can_edit(workspace_id) and public.company_workspace(company_id) = workspace_id);
create policy videos_delete on public.videos for delete to authenticated
  using (public.can_edit(workspace_id));

-- video_versions
create policy video_versions_select on public.video_versions for select to authenticated
  using (public.is_member(public.video_workspace(video_id)));
create policy video_versions_insert on public.video_versions for insert to authenticated
  with check (public.can_edit(public.video_workspace(video_id)));
create policy video_versions_update on public.video_versions for update to authenticated
  using (public.can_edit(public.video_workspace(video_id)))
  with check (public.can_edit(public.video_workspace(video_id)));

-- renders: read-only for members; created via export_video(), updated by the renderer (service role).
create policy renders_select on public.renders for select to authenticated
  using (public.is_member(public.video_workspace(video_id)));

-- wallet_ledger: read-only for members. No INSERT/UPDATE/DELETE policies for anyone.
-- Rows are written by export_video()/refund_render() and by the service role (top-ups).
create policy wallet_ledger_select on public.wallet_ledger for select to authenticated
  using (public.is_member(workspace_id));

-- Global reference data: any signed-in user reads; service role writes.
create policy voices_select   on public.voices   for select to authenticated using (true);
create policy prices_select   on public.prices   for select to authenticated using (true);
create policy fx_rates_select on public.fx_rates for select to authenticated using (true);

-- Belt and braces on top of RLS.
revoke all on public.wallet_ledger from anon;
revoke insert, update, delete, truncate on public.wallet_ledger from authenticated;
revoke insert, update, delete, truncate on public.renders       from anon, authenticated;
revoke insert, update, delete, truncate on public.voices        from anon, authenticated;
revoke insert, update, delete, truncate on public.prices        from anon, authenticated;
revoke insert, update, delete, truncate on public.fx_rates      from anon, authenticated;
-- Users may edit workspace settings but never wallet_balance_usd directly.
revoke insert, update, delete, truncate on public.workspaces    from anon, authenticated;
grant  update (name, country_code, currency_code, monthly_cap_usd) on public.workspaces to authenticated;

-- ---------------------------------------------------------------------
-- Storage: private bucket `brand-assets`.
-- Object paths: {workspace_id}/{company_id}/{file}
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', false)
on conflict (id) do nothing;

create or replace function public.storage_path_workspace(p_name text)
returns uuid
language sql immutable set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

create policy brand_assets_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'brand-assets' and public.is_member(public.storage_path_workspace(name)));
create policy brand_assets_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.can_edit(public.storage_path_workspace(name)));
create policy brand_assets_storage_update on storage.objects for update to authenticated
  using (bucket_id = 'brand-assets' and public.can_edit(public.storage_path_workspace(name)))
  with check (bucket_id = 'brand-assets' and public.can_edit(public.storage_path_workspace(name)));
create policy brand_assets_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'brand-assets' and public.can_edit(public.storage_path_workspace(name)));

-- ---------------------------------------------------------------------
-- Seed
-- ---------------------------------------------------------------------

-- Prices: video $1.50/min, voiceover +$1.00/min.
insert into public.prices (key, usd, active_from) values
  ('video_min',     1.50, '2026-01-01T00:00:00Z'),
  ('voiceover_min', 1.00, '2026-01-01T00:00:00Z');

-- FX: local units per 1 USD.
insert into public.fx_rates (currency_code, usd_rate, rate_date) values
  ('USD',  1.000000, current_date),
  ('EGP', 52.000000, current_date),
  ('SAR',  3.750000, current_date),  -- TODO real rate
  ('AED',  3.672500, current_date),  -- TODO real rate
  ('KWD',  0.307000, current_date),  -- TODO real rate
  ('JOD',  0.709000, current_date);  -- TODO real rate

-- Voices: 2 per dialect. provider_voice_id = 'TODO' until Phase 4 wires ElevenLabs.
insert into public.voices (provider, provider_voice_id, display_name, dialect, gender) values
  ('elevenlabs', 'TODO', 'سلمى',  'eg',   'female'),
  ('elevenlabs', 'TODO', 'شاكر',  'eg',   'male'),
  ('elevenlabs', 'TODO', 'زارية', 'sa',   'female'),
  ('elevenlabs', 'TODO', 'حامد',  'sa',   'male'),
  ('elevenlabs', 'TODO', 'فاطمة', 'gulf', 'female'),
  ('elevenlabs', 'TODO', 'حمدان', 'gulf', 'male'),
  ('elevenlabs', 'TODO', 'ليلى',  'lev',  'female'),
  ('elevenlabs', 'TODO', 'رامي',  'lev',  'male'),
  ('elevenlabs', 'TODO', 'زارية', 'msa',  'female'),
  ('elevenlabs', 'TODO', 'حامد',  'msa',  'male'),
  ('elevenlabs', 'TODO', 'Emma',  'en',   'female'),
  ('elevenlabs', 'TODO', 'Daniel','en',   'male');

-- Demo workspace (claimed by the first user to sign in — see bootstrap_workspace).
insert into public.workspaces (id, name, country_code, currency_code, monthly_cap_usd)
values ('00000000-0000-0000-0000-00000000d3e0', 'منتوج', 'EG', 'EGP', 50);

with c as (
  insert into public.companies (workspace_id, name, website_url, default_dialect)
  values ('00000000-0000-0000-0000-00000000d3e0', 'منتوج', 'https://mantoog.com', 'eg')
  returning id
)
insert into public.brand_profiles (company_id, colors, fonts, tone, tagline, raw)
select c.id,
  '[{"hex":"#3B82F6","role":"primary"},{"hex":"#0B0D12","role":"ink"},{"hex":"#7C5CFF","role":"accent"}]'::jsonb,
  '{"arabic":"Noto Kufi Arabic","latin":"Geist"}'::jsonb,
  'ودود، مباشر، بالمصري',
  'من لينك لمتجر',
  '{"source":"seed"}'::jsonb
from c;

-- Demo top-up of $24.04 (balance is set by the ledger trigger).
insert into public.wallet_ledger (workspace_id, kind, amount_usd, amount_local, currency_code, fx_rate, note)
values ('00000000-0000-0000-0000-00000000d3e0', 'topup', 24.04, 1250.08, 'EGP', 52.000000, 'Demo top-up');
