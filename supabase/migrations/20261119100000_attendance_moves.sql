begin;

-- A headcount saved under the wrong service can be moved by the designated
-- service lead. Every move, and every refused move, is kept as history.
create table public.service_attendance_moves (
  id uuid primary key default gen_random_uuid(),
  location text not null,
  from_date date not null,
  from_time time(0) not null,
  to_date date not null,
  to_time time(0) not null,
  men integer not null,
  women integer not null,
  children integer not null,
  first_timers integer not null,
  reason text not null check (length(btrim(reason)) between 5 and 500),
  status text not null check (status in ('moved', 'flagged', 'resolved')),
  requested_by uuid not null references auth.users(id),
  requested_at timestamptz not null default now(),
  resolution text check (resolution is null or length(btrim(resolution)) between 5 and 500),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  check ((status = 'resolved') = (resolved_by is not null and resolved_at is not null and resolution is not null))
);
create index service_attendance_moves_from on public.service_attendance_moves (from_date, from_time);
create index service_attendance_moves_to on public.service_attendance_moves (to_date, to_time);

alter table public.service_attendance_moves enable row level security;
revoke all on public.service_attendance_moves from anon, authenticated;
grant select on public.service_attendance_moves to authenticated;
create policy attendance_moves_read on public.service_attendance_moves
  for select to authenticated using (exists (
    select 1 from public.service_attendance_access where user_id = (select auth.uid())
  ));

-- Correction history follows its report when the report moves.
alter table public.service_attendance_corrections
  drop constraint service_attendance_correction_location_service_date_servic_fkey,
  add constraint service_attendance_corrections_report_fkey
    foreign key (location, service_date, service_time)
    references public.service_attendance (location, service_date, service_time) on update cascade;

create or replace function public.service_attendance_guard() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  -- Separate checks: PL/pgSQL does not guarantee short-circuit evaluation,
  -- and the history tables have different columns.
  if tg_op = 'UPDATE' then
    if tg_table_name = 'service_attendance'
      and coalesce(current_setting('pulse.attendance_correction', true), '') = 'on' then
      if (to_jsonb(new) - array['men', 'women', 'children', 'first_timers'])
        = (to_jsonb(old) - array['men', 'women', 'children', 'first_timers']) then
        return new;
      end if;
    end if;
    if tg_table_name in ('service_attendance', 'service_attendance_corrections')
      and coalesce(current_setting('pulse.attendance_move', true), '') = 'on' then
      if (to_jsonb(new) - array['service_date', 'service_time'])
        = (to_jsonb(old) - array['service_date', 'service_time']) then
        return new;
      end if;
    end if;
    if tg_table_name = 'service_attendance_moves'
      and coalesce(current_setting('pulse.attendance_move', true), '') = 'on' then
      if (to_jsonb(new) - array['status', 'resolution', 'resolved_by', 'resolved_at'])
        = (to_jsonb(old) - array['status', 'resolution', 'resolved_by', 'resolved_at']) then
        return new;
      end if;
    end if;
  end if;
  raise exception 'Attendance records are kept as submitted. Use the service lead correction tools.';
end;
$$;

create trigger service_attendance_moves_no_edit before update or delete on public.service_attendance_moves
  for each row execute function public.service_attendance_guard();

create function public.move_service_attendance(
  p_from_date date,
  p_from_time time,
  p_to_date date,
  p_to_time time,
  p_expected integer[],
  p_reason text
) returns text language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  report public.service_attendance;
  earlier public.service_attendance_moves;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if not exists (
    select 1 from public.service_attendance_access a where a.user_id = actor and a.can_correct
  ) then
    raise exception 'Only the designated service lead can move attendance.' using errcode = '42501';
  end if;
  if length(v_reason) < 5 then
    raise exception 'Give a reason for the move.' using errcode = '22023';
  end if;
  if (p_from_date, p_from_time) = (p_to_date, p_to_time) then
    raise exception 'Choose a different service.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.pulse_services s where s.service_date = p_to_date and s.service_time = p_to_time
  ) then
    raise exception 'The destination is not a scheduled service.' using errcode = '22023';
  end if;

  -- Serialize moves that involve either service.
  perform pg_advisory_xact_lock(hashtext('pulse.attendance'), hashtext(p_from_date::text || p_from_time::text));
  perform pg_advisory_xact_lock(hashtext('pulse.attendance'), hashtext(p_to_date::text || p_to_time::text));

  -- A retry of a request that already completed returns its first outcome.
  select m.* into earlier from public.service_attendance_moves m
  where (m.from_date, m.from_time, m.to_date, m.to_time) = (p_from_date, p_from_time, p_to_date, p_to_time)
    and m.requested_by = actor and m.reason = v_reason
    and array[m.men, m.women, m.children, m.first_timers] = p_expected
  order by m.requested_at desc limit 1;
  if found and (earlier.status = 'flagged' or not exists (
    select 1 from public.service_attendance r
    where r.location = 'Akute' and r.service_date = p_from_date and r.service_time = p_from_time
  )) then
    return earlier.status;
  end if;

  select r.* into report from public.service_attendance r
  where r.location = 'Akute' and r.service_date = p_from_date and r.service_time = p_from_time
  for update;
  if not found then
    raise exception 'Attendance report not found.' using errcode = 'P0002';
  end if;
  if p_expected is distinct from array[report.men, report.women, report.children, report.first_timers] then
    -- PT409 returns HTTP 409. PostgREST retries 40001 indefinitely, so it is not used.
    raise exception 'The report changed since it was opened. Reload and try again.' using errcode = 'PT409';
  end if;

  if exists (
    select 1 from public.service_attendance r
    where r.location = report.location and r.service_date = p_to_date and r.service_time = p_to_time
  ) then
    insert into public.service_attendance_moves (
      location, from_date, from_time, to_date, to_time, men, women, children, first_timers, reason, status, requested_by
    ) values (
      report.location, p_from_date, p_from_time, p_to_date, p_to_time,
      report.men, report.women, report.children, report.first_timers, v_reason, 'flagged', actor
    );
    return 'flagged';
  end if;

  insert into public.service_attendance_moves (
    location, from_date, from_time, to_date, to_time, men, women, children, first_timers, reason, status, requested_by
  ) values (
    report.location, p_from_date, p_from_time, p_to_date, p_to_time,
    report.men, report.women, report.children, report.first_timers, v_reason, 'moved', actor
  );
  perform set_config('pulse.attendance_move', 'on', true);
  update public.service_attendance
    set service_date = p_to_date, service_time = p_to_time
    where location = report.location and service_date = p_from_date and service_time = p_from_time;
  perform set_config('pulse.attendance_move', 'off', true);
  return 'moved';
end;
$$;

create function public.resolve_attendance_flag(p_id uuid, p_resolution text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  flag public.service_attendance_moves;
  v_note text := btrim(coalesce(p_resolution, ''));
begin
  if not exists (
    select 1 from public.service_attendance_access a where a.user_id = actor and a.can_correct
  ) then
    raise exception 'Only the designated service lead can resolve attendance flags.' using errcode = '42501';
  end if;
  if length(v_note) < 5 then
    raise exception 'Describe how the flag was reconciled.' using errcode = '22023';
  end if;
  select m.* into flag from public.service_attendance_moves m where m.id = p_id for update;
  if not found or flag.status = 'moved' then
    raise exception 'Flag not found.' using errcode = 'P0002';
  end if;
  if flag.status = 'resolved' then
    if flag.resolved_by = actor and flag.resolution = v_note then return; end if;
    raise exception 'This flag is already resolved.' using errcode = '22023';
  end if;
  perform set_config('pulse.attendance_move', 'on', true);
  update public.service_attendance_moves
    set status = 'resolved', resolution = v_note, resolved_by = actor, resolved_at = now()
    where id = p_id;
  perform set_config('pulse.attendance_move', 'off', true);
end;
$$;

revoke execute on function public.move_service_attendance(date, time, date, time, integer[], text) from public, anon;
grant execute on function public.move_service_attendance(date, time, date, time, integer[], text) to authenticated;
revoke execute on function public.resolve_attendance_flag(uuid, text) from public, anon;
grant execute on function public.resolve_attendance_flag(uuid, text) to authenticated;

commit;
