-- Atomic slide reorder + remap sessions.current_slide to the same slide after reorder.
-- Avoids unique (session_id, "order") violations from row-by-row updates and wraps everything in one transaction.

create or replace function public.reorder_session_slides(p_session_id uuid, p_ordered_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  old_ids uuid[];
  cur_idx int;
  cur_id uuid;
  new_idx int;
begin
  select count(*)::int into n from public.slides where session_id = p_session_id;

  if n = 0 then
    if p_ordered_ids is null or coalesce(array_length(p_ordered_ids, 1), 0) = 0 then
      return;
    end if;
    raise exception 'slide count mismatch';
  end if;

  if p_ordered_ids is null or coalesce(array_length(p_ordered_ids, 1), 0) != n then
    raise exception 'slide count mismatch';
  end if;

  if exists (select 1 from unnest(p_ordered_ids) u group by u having count(*) > 1) then
    raise exception 'duplicate slide ids';
  end if;

  select coalesce(array_agg(id order by "order"), array[]::uuid[]) into old_ids
  from public.slides
  where session_id = p_session_id;

  if old_ids is null or cardinality(old_ids) != n then
    raise exception 'slide count mismatch';
  end if;

  if exists (
    select 1
    from unnest(p_ordered_ids) as u(id)
    where not (u.id = any (old_ids))
  ) then
    raise exception 'invalid slide id in reorder list';
  end if;

  select current_slide into cur_idx
  from public.sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'session not found';
  end if;

  cur_idx := least(greatest(coalesce(cur_idx, 0), 0), n - 1);
  cur_id := old_ids[cur_idx + 1];

  update public.slides as s
  set "order" = ord.new_order
  from (
    select id, (t.ordinality - 1)::int as new_order
    from unnest(p_ordered_ids) with ordinality as t(id, ordinality)
  ) as ord
  where s.id = ord.id
    and s.session_id = p_session_id;

  select (t.ordinality - 1)::int into new_idx
  from unnest(p_ordered_ids) with ordinality as t(id, ordinality)
  where t.id = cur_id;

  if new_idx is null then
    new_idx := 0;
  end if;

  new_idx := least(new_idx, greatest(n - 1, 0));

  update public.sessions
  set current_slide = new_idx
  where id = p_session_id;
end;
$$;

revoke all on function public.reorder_session_slides(uuid, uuid[]) from public;
grant execute on function public.reorder_session_slides(uuid, uuid[]) to service_role;
