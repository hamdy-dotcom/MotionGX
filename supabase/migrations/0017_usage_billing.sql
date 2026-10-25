-- =====================================================================
-- MotionGX — 0017_usage_billing.sql (pay for what it costs)
-- The workspace pays the real AI cost of what it starts × prices.cost_multiplier (2). A brand capture is paid at
-- × prices.capture_multiplier (1), and the workspace's first capture is free. The fixed prices (video minute,
-- post) stop: exports and downloads are free.
-- A job first holds its estimate (wallet_holds: the available balance = balance − open holds), is charged its real
-- cost when it ends (never more than it held), and the rest is released. A job that fails on our side is released.
-- ADDITIVE: new table, new ledger kind and column, new functions; export_video / export_post / refund_render replaced.
-- =====================================================================

begin;

-- ── 1. the multipliers ───────────────────────────────────────────────────────────────────────────────
alter table public.prices drop constraint if exists prices_key_check;
alter table public.prices add constraint prices_key_check check (key in ('video_min', 'voiceover_min', 'post', 'cost_multiplier', 'capture_multiplier'));
insert into public.prices (key, usd, active_from)
  select 'cost_multiplier', 2, '2026-01-01T00:00:00Z' where not exists (select 1 from public.prices where key = 'cost_multiplier');
insert into public.prices (key, usd, active_from)
  select 'capture_multiplier', 1, '2026-01-01T00:00:00Z' where not exists (select 1 from public.prices where key = 'capture_multiplier');

-- ── 2. holds ─────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.wallet_holds (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete restrict,
  kind          text not null check (kind in ('video', 'post', 'capture', 'idea', 'plan')),
  amount_usd    numeric(12,4) not null check (amount_usd >= 0),
  video_id      uuid references public.videos(id) on delete set null,
  post_id       uuid references public.posts(id) on delete set null,
  capture_id    uuid references public.live_brand_captures(id) on delete set null,
  job_id        uuid references public.live_jobs(id) on delete set null,
  status        text not null default 'open' check (status in ('open', 'charged', 'released')),
  cost_usd      numeric(12,5),
  charged_usd   numeric(12,4),
  note          text,
  created_at    timestamptz not null default now(),
  closed_at     timestamptz
);
create index if not exists wallet_holds_open_idx on public.wallet_holds(workspace_id) where status = 'open';
create unique index if not exists wallet_holds_one_per_job on public.wallet_holds(job_id) where job_id is not null;
alter table public.wallet_holds enable row level security;
drop policy if exists wallet_holds_select on public.wallet_holds;
create policy wallet_holds_select on public.wallet_holds for select to authenticated using (public.is_member(workspace_id));
revoke insert, update, delete, truncate on public.wallet_holds from anon, authenticated;

-- ── 3. the ledger: a 'usage' charge per hold ─────────────────────────────────────────────────────────
alter table public.wallet_ledger add column if not exists ref_hold_id uuid references public.wallet_holds(id) on delete restrict;
alter table public.wallet_ledger drop constraint if exists wallet_ledger_kind_check;
alter table public.wallet_ledger add constraint wallet_ledger_kind_check check (kind in ('topup', 'export', 'refund', 'adjustment', 'usage'));
alter table public.wallet_ledger drop constraint if exists wallet_ledger_check;
alter table public.wallet_ledger add constraint wallet_ledger_check check (
  (kind = 'topup'  and amount_usd > 0) or
  (kind = 'export' and amount_usd < 0 and (ref_render_id is not null or ref_post_id is not null)) or
  (kind = 'refund' and amount_usd > 0 and ref_render_id is not null) or
  (kind = 'usage'  and amount_usd < 0 and ref_hold_id is not null) or
  (kind = 'adjustment')
);
create unique index if not exists wallet_ledger_one_usage_per_hold on public.wallet_ledger(ref_hold_id) where kind = 'usage';

-- ── 4. functions ─────────────────────────────────────────────────────────────────────────────────────
-- what the workspace can still spend: its balance minus the open holds
create or replace function public.wallet_available(p_workspace_id uuid)
returns numeric
language sql stable security definer set search_path = ''
as $$
  select w.wallet_balance_usd - coalesce((select sum(h.amount_usd) from public.wallet_holds h where h.workspace_id = w.id and h.status = 'open'), 0)
  from public.workspaces w where w.id = p_workspace_id;
$$;

-- reserve an estimate before a job starts; raises 'insufficient_balance' when it does not fit
create or replace function public.wallet_hold(p_workspace_id uuid, p_kind text, p_amount numeric, p_video_id uuid default null, p_post_id uuid default null, p_capture_id uuid default null, p_note text default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_available numeric;
  v_id uuid;
begin
  if auth.role() <> 'service_role' and not public.can_edit(p_workspace_id) then
    raise exception 'not allowed';
  end if;
  perform 1 from public.workspaces where id = p_workspace_id for update;
  v_available := public.wallet_available(p_workspace_id);
  if p_amount > 0 and v_available < p_amount then
    raise exception 'insufficient_balance' using hint = format('need %s USD, have %s USD', round(p_amount, 4), round(v_available, 4));
  end if;
  insert into public.wallet_holds (workspace_id, kind, amount_usd, video_id, post_id, capture_id, note)
  values (p_workspace_id, p_kind, round(greatest(p_amount, 0), 4), p_video_id, p_post_id, p_capture_id, p_note)
  returning id into v_id;
  return v_id;
end;
$$;

-- what a real cost is billed at: × cost_multiplier; a capture × capture_multiplier, and free when it is the
-- workspace's first finished capture
create or replace function public.billed_usd(p_workspace_id uuid, p_kind text, p_cost numeric, p_capture_id uuid default null)
returns numeric
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_kind = 'capture' then
    if not exists (select 1 from public.live_brand_captures c where c.workspace_id = p_workspace_id and c.status = 'done' and c.id is distinct from p_capture_id) then
      return 0;
    end if;
    return round(p_cost * coalesce(public.current_price('capture_multiplier'), 1), 4);
  end if;
  return round(p_cost * coalesce(public.current_price('cost_multiplier'), 2), 4);
end;
$$;

-- a job ended: charge its billed cost (at most what it held, never past the balance) and close the hold
create or replace function public.wallet_settle(p_hold_id uuid, p_cost numeric)
returns numeric
language plpgsql security definer set search_path = ''
as $$
declare
  v_h      public.wallet_holds%rowtype;
  v_ws     public.workspaces%rowtype;
  v_room   numeric;
  v_charge numeric(12,4);
  v_fx     numeric;
begin
  select * into v_h from public.wallet_holds where id = p_hold_id for update;
  if not found or v_h.status <> 'open' then
    return 0;
  end if;
  select * into v_ws from public.workspaces where id = v_h.workspace_id for update;
  v_charge := public.billed_usd(v_h.workspace_id, v_h.kind, greatest(coalesce(p_cost, 0), 0), v_h.capture_id);
  if v_h.amount_usd > 0 then
    v_charge := least(v_charge, v_h.amount_usd);
  end if;
  -- never past the balance (the other open holds keep their share)
  v_room := v_ws.wallet_balance_usd - coalesce((select sum(h.amount_usd) from public.wallet_holds h where h.workspace_id = v_ws.id and h.status = 'open' and h.id <> v_h.id), 0);
  v_charge := round(greatest(least(v_charge, v_room), 0), 4);
  if v_charge > 0 then
    v_fx := coalesce(public.latest_fx_rate(v_ws.currency_code), case when v_ws.currency_code = 'USD' then 1 end);
    insert into public.wallet_ledger (workspace_id, kind, amount_usd, amount_local, currency_code, fx_rate, ref_hold_id, note)
    values (v_ws.id, 'usage', -v_charge, round(-v_charge * v_fx, 2), v_ws.currency_code, v_fx, v_h.id, v_h.note);
  end if;
  update public.wallet_holds set status = 'charged', cost_usd = round(coalesce(p_cost, 0), 5), charged_usd = v_charge, closed_at = now() where id = v_h.id;
  return v_charge;
end;
$$;

-- a job failed on our side: nothing is charged
create or replace function public.wallet_release(p_hold_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.wallet_holds set status = 'released', closed_at = now() where id = p_hold_id and status = 'open';
end;
$$;

-- ── 5. exports and downloads are free now ────────────────────────────────────────────────────────────
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
  select vv.id into v_version from public.video_versions vv where vv.video_id = p_video_id order by vv.version desc limit 1;
  if v_version is null then
    raise exception 'video has no script yet';
  end if;
  insert into public.renders (video_id, version_id, status, billed_seconds, cost_usd)
  values (p_video_id, v_version, 'queued', 0, 0)
  returning id into v_render;
  update public.videos set status = 'exporting' where id = p_video_id;
  return v_render;
end;
$$;

create or replace function public.export_post(p_post_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_post public.posts%rowtype;
begin
  select * into v_post from public.posts where id = p_post_id;
  if not found or not public.can_edit(v_post.workspace_id) then
    raise exception 'post not found';
  end if;
  if not exists (select 1 from public.post_versions where post_id = p_post_id) then
    raise exception 'post has no version yet';
  end if;
  update public.posts set exported_at = coalesce(exported_at, now()) where id = p_post_id;
  return jsonb_build_object('charged', false, 'cost_usd', 0);
end;
$$;

-- a failed export: refunded when it was charged (exports before this migration), else just marked failed
create or replace function public.refund_render(p_render_id uuid, p_error text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_charge public.wallet_ledger%rowtype;
begin
  update public.renders set status = 'failed', error = p_error where id = p_render_id;
  update public.videos v set status = 'failed' from public.renders r where r.id = p_render_id and v.id = r.video_id;
  select * into v_charge from public.wallet_ledger where ref_render_id = p_render_id and kind = 'export';
  if found and not exists (select 1 from public.wallet_ledger where ref_render_id = p_render_id and kind = 'refund') then
    insert into public.wallet_ledger (workspace_id, kind, amount_usd, amount_local, currency_code, fx_rate, ref_render_id, note)
    values (v_charge.workspace_id, 'refund', -v_charge.amount_usd, -v_charge.amount_local, v_charge.currency_code, v_charge.fx_rate, p_render_id, 'Auto-refund: export failed');
  end if;
end;
$$;

revoke execute on function public.wallet_settle(uuid, numeric) from public, anon, authenticated;
revoke execute on function public.wallet_release(uuid) from public, anon, authenticated;
revoke execute on function public.wallet_hold(uuid, text, numeric, uuid, uuid, uuid, text) from public, anon;
grant  execute on function public.wallet_hold(uuid, text, numeric, uuid, uuid, uuid, text) to authenticated;
revoke execute on function public.refund_render(uuid, text) from public, anon, authenticated;

commit;
