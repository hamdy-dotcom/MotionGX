-- =====================================================================
-- MotionGX — 0006_illustrations.sql (Phase 3F: hero illustrations library)
-- Run after 0005_spec.sql. Then: pnpm illustrations:sync (uploads the local library file).
-- =====================================================================

-- Hero illustrations Sonnet drew (seeded, or shipped in a downloaded video). Reused across brands in the
-- same STYLE at zero AI cost; brand colours and stroke are applied at render time (colour roles only).
-- Server-only (service role); never exposed to members.
create table if not exists public.illustrations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,                         -- snake_case, e.g. warehouse_shelves
  style        text not null check (style in ('line', 'flat', 'isometric', 'paper-cut', 'clay-3d', 'hand-drawn', 'neon-outline', 'duotone')),
  shows        text not null,                         -- what it depicts (embedded with the name)
  tags         text[] not null default '{}',
  parts        jsonb not null default '[]',           -- params schema: [{ name, does }], each a 0..1 prop
  directional  boolean not null default false,        -- mirrored in RTL videos
  embedding    vector(384) not null,                  -- paraphrase-multilingual-MiniLM-L12-v2 of "name. shows"
  tsx          text not null,
  js           text not null,
  hash         text not null unique,                  -- sha1(tsx)[0:16]
  uses         int not null default 1 check (uses >= 0),
  avg_taste    real,
  taste_n      int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists illustrations_style_idx on public.illustrations (style);
create index if not exists illustrations_embedding_idx on public.illustrations using hnsw (embedding vector_cosine_ops);
alter table public.illustrations enable row level security;
revoke all on public.illustrations from anon, authenticated;

-- Every illustration a generated video shows, per workspace: a workspace never sees the same
-- illustration again within its last 5 videos.
create table if not exists public.illustration_uses (
  id                 bigint generated always as identity primary key,
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  video_ref          text not null,                   -- video id, or the generation id before a video row exists
  illustration_hash  text not null,
  created_at         timestamptz not null default now()
);
create index if not exists illustration_uses_ws_idx on public.illustration_uses (workspace_id, created_at desc);
alter table public.illustration_uses enable row level security;
revoke all on public.illustration_uses from anon, authenticated;

-- Illustration calls are logged (and costed) separately.
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('brand_scrape', 'brand_tone', 'brand_facts', 'script', 'rewrite_scene', 'request_edit',
                  'director', 'motion_code', 'vision_qa', 'ref_card', 'motion_spec', 'spec_patch', 'illustration'));
