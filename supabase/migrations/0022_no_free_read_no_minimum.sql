-- =====================================================================
-- MotionGX — 0022_no_free_read_no_minimum.sql
-- Every job is its real cost × the multiplier: reading a website × capture_multiplier (1), with no free first read;
-- everything else × cost_multiplier (2). The app stops passing a minimum. minimum_usd stays, at 0, for old rows.
-- =====================================================================
create or replace function public.billed_usd(p_workspace_id uuid, p_kind text, p_cost numeric, p_capture_id uuid default null)
returns numeric
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_kind = 'capture' then
    return round(p_cost * coalesce(public.current_price('capture_multiplier'), 1), 4);
  end if;
  return round(p_cost * coalesce(public.current_price('cost_multiplier'), 2), 4);
end;
$$;
