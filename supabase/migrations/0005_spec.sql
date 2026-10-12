-- =====================================================================
-- MotionGX — 0005_spec.sql (Phase 3C: videos are MotionSpecs, not generated code)
-- Run after 0004_generative.sql.
-- =====================================================================

-- A version stores the spec the engine renders (data, not code). composition_code/_js stay for
-- Phase 3B versions until those are retired.
alter table public.video_versions
  add column if not exists spec        jsonb,
  add column if not exists plan        jsonb,   -- concept, shots, energy map (the director's plan)
  add column if not exists custom_js   jsonb;   -- vetted custom elements: { elementId: compiled js }

-- Prompt-cache accounting per call.
alter table public.ai_usage
  add column if not exists cache_read_tokens  int not null default 0 check (cache_read_tokens >= 0),
  add column if not exists cache_write_tokens int not null default 0 check (cache_write_tokens >= 0);
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('brand_scrape', 'brand_tone', 'brand_facts', 'script', 'rewrite_scene', 'request_edit',
                  'director', 'motion_code', 'vision_qa', 'ref_card', 'motion_spec', 'spec_patch'));

-- Custom effects that passed review and shipped in a downloaded video are promoted here, so the
-- behavior library grows from real use. Server-only (service role); never exposed to members.
create table if not exists public.motion_custom_behaviors (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  note             text,
  tsx              text not null,
  js               text not null,
  source_video_id  uuid references public.videos(id) on delete set null,
  source_element   text,
  uses             int not null default 1,
  promoted_at      timestamptz not null default now()
);
alter table public.motion_custom_behaviors enable row level security;
revoke all on public.motion_custom_behaviors from anon, authenticated;
