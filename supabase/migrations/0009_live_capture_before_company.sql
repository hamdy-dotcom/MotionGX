-- =====================================================================
-- MotionGX — 0009_live_capture_before_company.sql
-- The live engine's brand capture now runs on "Add company", before the company row exists
-- (the capture is linked to the company when the user presses "تأكيد وحفظ الشركة").
-- Only relaxes two NOT NULL constraints; no data changes, nothing dropped or renamed.
-- =====================================================================

begin;

alter table public.live_brand_captures alter column company_id drop not null;
alter table public.live_jobs alter column company_id drop not null;

-- reuse lookups by site (the sandbox reuses brands/<site> until a re-read)
create index if not exists live_brand_captures_ws_domain_idx on public.live_brand_captures(workspace_id, domain, created_at desc);

commit;
