-- Phase 4: session analytics (persisted) + optional cleanup helper for expired sessions.

alter table public.sessions
  add column if not exists live_started_at timestamptz,
  add column if not exists live_ended_at timestamptz,
  add column if not exists peak_viewer_count int not null default 0;

comment on column public.sessions.live_started_at is 'First time presenter set session status to live';
comment on column public.sessions.live_ended_at is 'When session moved to ended';
comment on column public.sessions.peak_viewer_count is 'Max concurrent viewers (socket join count) observed';

-- Atomic monotonic peak (called from API service role).
create or replace function public.bump_peak_viewer_count(p_session_id uuid, p_count int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.sessions
  set peak_viewer_count = greatest(peak_viewer_count, greatest(p_count, 0))
  where id = p_session_id;
$$;

revoke all on function public.bump_peak_viewer_count(uuid, int) from public;
grant execute on function public.bump_peak_viewer_count(uuid, int) to service_role;

-- Call from pg_cron, Edge Function, or manual SQL. Deletes expired sessions (slides cascade).
create or replace function public.cleanup_expired_sessions()
returns int
language sql
security definer
set search_path = public
as $$
  with d as (
    delete from public.sessions
    where expires_at < now()
    returning id
  )
  select count(*)::int from d;
$$;

revoke all on function public.cleanup_expired_sessions() from public;
grant execute on function public.cleanup_expired_sessions() to service_role;

-- Optional (requires pg_cron extension): schedule hourly cleanup.
-- select cron.schedule('cleanup-expired-sessions', '0 * * * *', 'select public.cleanup_expired_sessions()');
