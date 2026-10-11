-- =====================================================================
-- MotionGX — 0002_ai_usage.sql (Phase 2)
-- Per-call token log for AI + Firecrawl calls. Feeds the 30 calls/workspace/hour limit.
-- AI calls are free to the user; nothing here touches the wallet.
-- =====================================================================

create table public.ai_usage (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  kind           text not null check (kind in ('brand_scrape', 'brand_tone', 'script', 'rewrite_scene', 'request_edit')),
  model          text not null,
  input_tokens   int  not null default 0 check (input_tokens >= 0),
  output_tokens  int  not null default 0 check (output_tokens >= 0),
  created_at     timestamptz not null default now()
);

create index ai_usage_workspace_created_idx on public.ai_usage(workspace_id, created_at desc);

alter table public.ai_usage enable row level security;

-- Members can read their workspace's usage. Rows are written by the server (service role) only.
create policy ai_usage_select on public.ai_usage for select to authenticated
  using (public.is_member(workspace_id));

revoke insert, update, delete, truncate on public.ai_usage from anon, authenticated;
