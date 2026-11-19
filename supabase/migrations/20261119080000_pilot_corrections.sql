begin;

-- Treasury reversals stay on the original service so the per-service
-- collection list can show an entry and its reversal together.
create or replace function public.set_treasury_service_details() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if new.reverses_id is not null and new.pulse_service_id is null then
    select i.pulse_service_id into new.pulse_service_id
    from public.treasury_income i where i.id = new.reverses_id;
  end if;
  if new.pulse_service_id is not null then
    select s.service_date, s.title into strict new.entry_date, new.service
    from public.pulse_services s where s.id = new.pulse_service_id;
  end if;
  return new;
end;
$$;

-- Attendance corrections are made only by a designated service lead,
-- through correct_service_attendance, and every change is kept.
alter table public.service_attendance_access add column can_correct boolean not null default false;

create table public.service_attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  location text not null,
  service_date date not null,
  service_time time(0) not null,
  previous_men integer not null,
  previous_women integer not null,
  previous_children integer not null,
  previous_first_timers integer not null,
  men integer not null,
  women integer not null,
  children integer not null,
  first_timers integer not null,
  reason text not null check (length(btrim(reason)) between 5 and 500),
  corrected_by uuid not null references auth.users(id),
  corrected_at timestamptz not null default now(),
  foreign key (location, service_date, service_time)
    references public.service_attendance (location, service_date, service_time)
);
create index service_attendance_corrections_report
  on public.service_attendance_corrections (location, service_date, service_time, corrected_at);

alter table public.service_attendance_corrections enable row level security;
revoke all on public.service_attendance_corrections from anon, authenticated;
grant select on public.service_attendance_corrections to authenticated;
create policy attendance_corrections_read on public.service_attendance_corrections
  for select to authenticated using (exists (
    select 1 from public.service_attendance_access where user_id = (select auth.uid())
  ));

create function public.service_attendance_guard() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  -- Separate checks: PL/pgSQL does not guarantee short-circuit evaluation,
  -- and the correction log has no submitted_by column.
  if tg_table_name = 'service_attendance' and tg_op = 'UPDATE'
    and coalesce(current_setting('pulse.attendance_correction', true), '') = 'on' then
    if (to_jsonb(new) - array['men', 'women', 'children', 'first_timers'])
      = (to_jsonb(old) - array['men', 'women', 'children', 'first_timers']) then
      return new;
    end if;
  end if;
  raise exception 'Attendance records are kept as submitted. Use correct_service_attendance.';
end;
$$;

create trigger service_attendance_no_edit before update or delete on public.service_attendance
  for each row execute function public.service_attendance_guard();
create trigger service_attendance_corrections_no_edit before update or delete on public.service_attendance_corrections
  for each row execute function public.service_attendance_guard();

create function public.correct_service_attendance(
  p_service_date date,
  p_service_time time,
  p_expected integer[],
  p_men integer,
  p_women integer,
  p_children integer,
  p_first_timers integer,
  p_reason text
) returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  report public.service_attendance;
  latest public.service_attendance_corrections;
  reason text := btrim(coalesce(p_reason, ''));
  corrected integer[] := array[p_men, p_women, p_children, p_first_timers];
begin
  if not exists (
    select 1 from public.service_attendance_access a where a.user_id = actor and a.can_correct
  ) then
    raise exception 'Only the designated service lead can correct attendance.' using errcode = '42501';
  end if;
  if length(reason) < 5 then
    raise exception 'Give a reason for the correction.' using errcode = '22023';
  end if;

  select r.* into report from public.service_attendance r
  where r.location = 'Akute' and r.service_date = p_service_date and r.service_time = p_service_time
  for update;
  if not found then
    raise exception 'Attendance report not found.' using errcode = 'P0002';
  end if;

  if array[report.men, report.women, report.children, report.first_timers] = corrected then
    -- A retry of a correction that already committed succeeds quietly.
    select c.* into latest from public.service_attendance_corrections c
    where (c.location, c.service_date, c.service_time) = (report.location, report.service_date, report.service_time)
    order by c.corrected_at desc limit 1;
    if found and latest.corrected_by = actor and latest.reason = reason then return; end if;
    raise exception 'The corrected counts match the saved report.' using errcode = '22023';
  end if;
  if p_expected is distinct from array[report.men, report.women, report.children, report.first_timers] then
    -- PT409 returns HTTP 409. PostgREST retries 40001 indefinitely, so it is not used.
    raise exception 'The report changed since it was opened. Reload and try again.' using errcode = 'PT409';
  end if;

  insert into public.service_attendance_corrections (
    location, service_date, service_time,
    previous_men, previous_women, previous_children, previous_first_timers,
    men, women, children, first_timers, reason, corrected_by
  ) values (
    report.location, report.service_date, report.service_time,
    report.men, report.women, report.children, report.first_timers,
    p_men, p_women, p_children, p_first_timers, reason, actor
  );

  perform set_config('pulse.attendance_correction', 'on', true);
  update public.service_attendance
    set men = p_men, women = p_women, children = p_children, first_timers = p_first_timers
    where location = report.location and service_date = report.service_date and service_time = report.service_time;
  perform set_config('pulse.attendance_correction', 'off', true);
end;
$$;

revoke execute on function public.correct_service_attendance(date, time, integer[], integer, integer, integer, integer, text) from public, anon;
grant execute on function public.correct_service_attendance(date, time, integer[], integer, integer, integer, integer, text) to authenticated;

commit;
