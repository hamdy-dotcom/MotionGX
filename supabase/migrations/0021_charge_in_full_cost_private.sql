-- =====================================================================
-- MotionGX — 0021_charge_in_full_cost_private.sql
-- 1. A job is charged its full price even when it ran past its estimate: the hold reserves, it no longer caps. Still never
--    past the balance, and a failure on our side is still released.
-- 2. What a job really cost stays on the server: signed-in members can't read it from the database.
-- =====================================================================
begin;

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
  v_charge := greatest(public.billed_usd(v_h.workspace_id, v_h.kind, greatest(coalesce(p_cost, 0), 0), v_h.capture_id), v_h.minimum_usd);
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
revoke execute on function public.wallet_settle(uuid, numeric) from public, anon, authenticated;

-- members read what they were charged, never what it cost
revoke select on public.wallet_holds from authenticated, anon;
grant select (id, workspace_id, kind, amount_usd, minimum_usd, video_id, post_id, capture_id, job_id, status, charged_usd, note, created_at, closed_at) on public.wallet_holds to authenticated;
revoke select on public.live_jobs from authenticated, anon;
grant select (id, workspace_id, video_id, post_id, company_id, capture_id, kind, mode, input, status, stage, done_steps, attempts, created_at, updated_at) on public.live_jobs to authenticated;
revoke select on public.live_brand_captures from authenticated, anon;
grant select (id, workspace_id, company_id, version, domain, site_url, status, app_status, steps, pages, app_screens, manifest, profile, storage_prefix, error, created_at, updated_at) on public.live_brand_captures to authenticated;
revoke select on public.ai_usage from authenticated, anon;
-- pieces carried their running cost; from now on it is the billed amount, and old values go
update public.posts set generation = generation - 'cost_usd' where generation ? 'cost_usd' and status <> 'generating';
update public.videos set generation = generation - 'cost_usd' where generation ? 'cost_usd' and status <> 'generating';

-- the run files that record what a job cost stay on the server (the app never reads them for members)
drop policy if exists live_engine_storage_select on storage.objects;
create policy live_engine_storage_select on storage.objects for select to authenticated
  using (bucket_id = 'live-engine' and public.is_member(public.storage_path_workspace(name)) and name !~ '/(cost|summary)\.json$' and name !~ '/worker\.log$');

commit;
