-- =====================================================================
-- MotionGX — 0011_director_agent_kind.sql
-- The director engine (VIDEO_ENGINE=director) logs every model call of its agent to ai_usage. One video is one user
-- action that makes ~20-45 agent calls, so — like the live capture agent (live_capture, decision Q8) — its calls get
-- their own kind and stay outside the workspace's 30-calls-per-hour limit (still logged, still costed).
-- Also moves the director rows already logged as live_build (the live engine never uses Opus) to the new kind.
-- =====================================================================

begin;

alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('brand_scrape', 'brand_tone', 'brand_facts', 'request_edit',
                  'brief', 'concept', 'script', 'author', 'review',
                  'rewrite_scene', 'director', 'motion_code', 'vision_qa', 'ref_card', 'motion_spec', 'spec_patch', 'illustration',
                  'live_capture', 'live_profile', 'live_script', 'live_build', 'live_qa', 'live_repair',
                  'live_direct', 'director_agent'));

update public.ai_usage set kind = 'director_agent' where kind = 'live_build' and model like 'claude-opus%';

commit;
