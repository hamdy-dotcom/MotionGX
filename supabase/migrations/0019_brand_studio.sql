-- =====================================================================
-- MotionGX — 0019_brand_studio.sql (the brand creator)
-- The final brand pack is paid like any app-side AI action: its real cost × prices.cost_multiplier (2 = 200%).
-- ADDITIVE: one more hold kind; the talk and the previews are logged under the existing 'brand_facts'.
-- =====================================================================
begin;
alter table public.wallet_holds drop constraint if exists wallet_holds_kind_check;
alter table public.wallet_holds add constraint wallet_holds_kind_check check (kind in ('video', 'post', 'capture', 'idea', 'plan', 'brand'));
commit;
