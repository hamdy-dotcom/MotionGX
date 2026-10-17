-- =====================================================================
-- MotionGX — 0010_live_direct_kind.sql
-- The live engine's director call (step "direct": picks highlight, chips, camera focus, button per scene)
-- gets its own ai_usage kind. Widens the check constraint only; no rows change.
-- =====================================================================

begin;

alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('brand_scrape', 'brand_tone', 'brand_facts', 'request_edit',
                  'brief', 'concept', 'script', 'author', 'review',
                  'rewrite_scene', 'director', 'motion_code', 'vision_qa', 'ref_card', 'motion_spec', 'spec_patch', 'illustration',
                  'live_capture', 'live_profile', 'live_script', 'live_build', 'live_qa', 'live_repair',
                  'live_direct'));

commit;
