-- =====================================================================
-- MotionGX — 0016_notice_history.sql (the notifications page keeps a history)
-- ADDITIVE ONLY: two nullable columns and a widened check constraint. No data changes.
--   notice_states.notice   — what the notice said when it was shown (a season / trend / reminder), for the history
--   notice_states.seen_at  — when the member first saw it
--   notice_states.status   — also 'seen' (shown, not answered yet)
-- =====================================================================

begin;

alter table public.notice_states add column if not exists notice jsonb;
alter table public.notice_states add column if not exists seen_at timestamptz;
alter table public.notice_states drop constraint if exists notice_states_status_check;
alter table public.notice_states add constraint notice_states_status_check check (status in ('seen', 'later', 'dismissed', 'acted'));
create index if not exists notice_states_history_idx on public.notice_states(user_id, company_id, updated_at desc);

commit;
