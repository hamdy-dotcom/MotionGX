-- =====================================================================
-- MotionGX — 0018_minimum_charge.sql (a new piece costs at least 20 EGP)
-- A new video / post / story / cover / carousel / text is charged at least a minimum (the app passes 20 EGP in USD at
-- the day's rate); edits, change requests, another direction, plan ideas, idea drafts and captures have none.
-- The hold of a new piece covers its minimum; a job that fails on our side is still released (no minimum).
-- ADDITIVE: one column; wallet_hold gets a p_minimum argument; wallet_settle applies it.
-- =====================================================================

begin;

alter table public.wallet_holds add column if not exists minimum_usd numeric(12,4) not null default 0 check (minimum_usd >= 0);

drop function if exists public.wallet_hold(uuid, text, numeric, uuid, uuid, uuid, text);
create or replace function public.wallet_hold(p_workspace_id uuid, p_kind text, p_amount numeric, p_video_id uuid default null, p_post_id uuid default null, p_capture_id uuid default null, p_note text default null, p_minimum numeric default 0)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_available numeric;
  v_amount numeric := round(greatest(coalesce(p_amount, 0), coalesce(p_minimum, 0), 0), 4);
  v_id uuid;
begin
  if auth.role() <> 'service_role' and not public.can_edit(p_workspace_id) then
    raise exception 'not allowed';
  end if;
  perform 1 from public.workspaces where id = p_workspace_id for update;
  v_available := public.wallet_available(p_workspace_id);
  if v_amount > 0 and v_available < v_amount then
    raise exception 'insufficient_balance' using hint = format('need %s USD, have %s USD', v_amount, round(v_available, 4));
  end if;
  insert into public.wallet_holds (workspace_id, kind, amount_usd, minimum_usd, video_id, post_id, capture_id, note)
  values (p_workspace_id, p_kind, v_amount, round(greatest(coalesce(p_minimum, 0), 0), 4), p_video_id, p_post_id, p_capture_id, p_note)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.wallet_hold(uuid, text, numeric, uuid, uuid, uuid, text, numeric) from public, anon;
grant  execute on function public.wallet_hold(uuid, text, numeric, uuid, uuid, uuid, text, numeric) to authenticated;

-- a job ended: its billed cost, at least the hold's minimum, at most what it held, never past the balance
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
  if v_h.amount_usd > 0 then
    v_charge := least(v_charge, v_h.amount_usd);
  end if;
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

commit;
