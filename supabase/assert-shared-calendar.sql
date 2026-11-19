insert into auth.users(id) values
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002');
insert into public.service_attendance_access(user_id, can_submit, can_schedule)
values ('10000000-0000-0000-0000-000000000001', true, true);
insert into public.treasury_members values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'admin', true);
insert into public.treasury_portal_access values
  ('20000000-0000-0000-0000-000000000001', 'pastor', '10000000-0000-0000-0000-000000000002');

set role authenticated;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
insert into public.pulse_services(title, service_date, service_time)
values ('Pilot service', '2026-11-22', '09:00');
insert into public.service_attendance(service_date, service_time, men, women, children, first_timers)
values ('2026-11-22', '09:00', 10, 12, 4, 2);
do $$
begin
  begin
    insert into public.service_attendance(service_date, service_time, men, women, children, first_timers)
    values ('2026-11-22', '10:00', 1, 1, 1, 0);
    raise exception 'Unscheduled service was accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.service_attendance(service_date, service_time, men, women, children, first_timers)
    values ('2026-11-22', '09:00', 10, 12, 4, 2);
    raise exception 'Duplicate attendance was accepted';
  exception when unique_violation then null;
  end;
end $$;

reset role;
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000003');
insert into public.treasury_members values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'treasurer', true);
insert into public.treasury_portal_access values
  ('20000000-0000-0000-0000-000000000001', 'treasury_leader', '10000000-0000-0000-0000-000000000003');

set role authenticated;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
insert into public.treasury_income(id, church_id, pulse_service_id)
select '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', id from public.pulse_services;
do $$
begin
  begin
    perform public.treasury_confirm_income('30000000-0000-0000-0000-000000000001');
    raise exception 'Self confirmation was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
do $$
begin
  begin
    perform public.treasury_confirm_income('30000000-0000-0000-0000-000000000001');
    raise exception 'Usher confirmation was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000003';
select public.treasury_confirm_income('30000000-0000-0000-0000-000000000001');
select public.treasury_confirm_income('30000000-0000-0000-0000-000000000001');
insert into public.treasury_income(id, church_id, pulse_service_id)
select '30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', id from public.pulse_services;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
select public.treasury_confirm_income('30000000-0000-0000-0000-000000000002');
do $$
begin
  if (select count(*) from public.treasury_income where confirmed_at is not null) <> 2 then
    raise exception 'Both independent confirmations must be recorded';
  end if;
end $$;

set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
insert into public.treasury_income(church_id, pulse_service_id)
select '20000000-0000-0000-0000-000000000001', id from public.pulse_services;
do $$
begin
  if not exists (select from public.treasury_income where entry_date = '2026-11-22' and service = 'Pilot service') then
    raise exception 'Treasury did not inherit shared service details';
  end if;
end $$;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
do $$
begin
  if exists (select from public.treasury_income) then
    raise exception 'Usher could read Treasury data';
  end if;
end $$;
do $$
begin
  if exists (select from public.treasury_monthly_reconciliation) then
    raise exception 'Usher could read Treasury reconciliation';
  end if;
end $$;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000002';
do $$
begin
  if not exists (
    select from public.treasury_monthly_reconciliation
    where kind = 'income' and confirmed_entries = 2 and confirmed_total = 200
      and pending_entries = 1 and pending_total = 100
  ) then
    raise exception 'Reconciliation must keep confirmed and pending income apart';
  end if;
end $$;

-- Reversals stay on the original service.
reset role;
insert into public.treasury_income(church_id, entered_by, amount, reverses_id, reversal_reason)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', -100,
  '30000000-0000-0000-0000-000000000001', 'Fixture reversal');
do $$
begin
  if not exists (
    select from public.treasury_income r join public.treasury_income o on o.id = r.reverses_id
    where r.reverses_id = '30000000-0000-0000-0000-000000000001'
      and r.pulse_service_id = o.pulse_service_id and r.service = 'Pilot service'
  ) then
    raise exception 'Reversal did not inherit the original service';
  end if;
end $$;

-- Attendance corrections: only the designated service lead, with a reason, keeping history.
insert into auth.users(id) values ('10000000-0000-0000-0000-000000000004');
insert into public.service_attendance_access(user_id, can_submit, can_schedule, can_correct)
values ('10000000-0000-0000-0000-000000000004', false, true, true);
set role authenticated;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
do $$
begin
  begin
    perform public.correct_service_attendance('2026-11-22', '09:00', array[10, 12, 4, 2], 10, 12, 3, 2, 'Usher attempt');
    raise exception 'Usher correction was accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.service_attendance set men = 1;
    raise exception 'Direct attendance edit was accepted';
  exception when insufficient_privilege or raise_exception then null;
  end;
end $$;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
do $$
begin
  begin
    perform public.correct_service_attendance('2026-11-22', '09:00', array[10, 12, 4, 2], 10, 12, 3, 2, 'no');
    raise exception 'Correction without a reason was accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;
select public.correct_service_attendance('2026-11-22', '09:00', array[10, 12, 4, 2], 10, 12, 3, 2, 'Paper shows 3 children');
-- A retry after a lost response succeeds without a second log entry.
select public.correct_service_attendance('2026-11-22', '09:00', array[10, 12, 4, 2], 10, 12, 3, 2, 'Paper shows 3 children');
do $$
begin
  begin
    perform public.correct_service_attendance('2026-11-22', '09:00', array[10, 12, 4, 2], 10, 11, 3, 2, 'Stale screen');
    raise exception 'Correction from a stale screen was accepted';
  exception when sqlstate 'PT409' then null;
  end;
  if (select count(*) from public.service_attendance_corrections) <> 1 then
    raise exception 'Expected exactly one correction record';
  end if;
  if not exists (
    select from public.service_attendance_corrections
    where previous_children = 4 and children = 3 and corrected_by = '10000000-0000-0000-0000-000000000004'
      and reason = 'Paper shows 3 children' and corrected_at is not null
  ) then
    raise exception 'Correction did not keep the original, corrected count, actor and time';
  end if;
  if (select children from public.service_attendance where service_date = '2026-11-22') <> 3 then
    raise exception 'Correction was not applied';
  end if;
end $$;
reset role;
do $$
begin
  begin
    update public.service_attendance_corrections set children = 9;
    raise exception 'Correction history was editable';
  exception when raise_exception then
    if sqlerrm not like 'Attendance records are kept as submitted%' then raise; end if;
  end;
end $$;


-- Moving a headcount to the right service, with history; refused moves are flagged.
set role authenticated;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
insert into public.pulse_services(title, service_date, service_time) values ('Pilot evening service', '2026-11-22', '18:00');
do $$
begin
  if public.move_service_attendance('2026-11-22', '09:00', '2026-11-22', '18:00', array[10, 12, 3, 2], 'Counted at the evening service') <> 'moved' then
    raise exception 'Move did not complete';
  end if;
  -- A retry after a lost response returns the first outcome.
  if public.move_service_attendance('2026-11-22', '09:00', '2026-11-22', '18:00', array[10, 12, 3, 2], 'Counted at the evening service') <> 'moved' then
    raise exception 'Move retry was not idempotent';
  end if;
  if (select count(*) from public.service_attendance_moves) <> 1 then
    raise exception 'Expected one move record';
  end if;
  if not exists (select from public.service_attendance_corrections where service_time = '18:00') then
    raise exception 'Correction history did not follow the moved report';
  end if;
  begin
    perform public.move_service_attendance('2026-11-22', '18:00', '2026-11-22', '07:00', array[10, 12, 3, 2], 'Unscheduled destination');
    raise exception 'Move to an unscheduled time was accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000001';
insert into public.service_attendance(service_date, service_time, men, women, children, first_timers)
values ('2026-11-22', '09:00', 20, 22, 5, 1);
do $$
begin
  begin
    perform public.move_service_attendance('2026-11-22', '09:00', '2026-11-22', '18:00', array[20, 22, 5, 1], 'Usher attempt');
    raise exception 'Usher move was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
set request.jwt.claim.sub = '10000000-0000-0000-0000-000000000004';
do $$
declare flag uuid;
begin
  if public.move_service_attendance('2026-11-22', '09:00', '2026-11-22', '18:00', array[20, 22, 5, 1], 'Destination already counted') <> 'flagged' then
    raise exception 'Move onto an occupied service was not flagged';
  end if;
  if public.move_service_attendance('2026-11-22', '09:00', '2026-11-22', '18:00', array[20, 22, 5, 1], 'Destination already counted') <> 'flagged'
    or (select count(*) from public.service_attendance_moves where status = 'flagged') <> 1 then
    raise exception 'Repeated refused move created a second flag';
  end if;
  if (select men from public.service_attendance where service_time = '09:00') <> 20
    or (select men from public.service_attendance where service_time = '18:00') <> 10 then
    raise exception 'A refused move changed a report';
  end if;
  select id into flag from public.service_attendance_moves where status = 'flagged';
  perform public.resolve_attendance_flag(flag, 'Both reports match paper');
  if not exists (select from public.service_attendance_moves where id = flag and status = 'resolved'
    and resolved_by = '10000000-0000-0000-0000-000000000004' and resolution = 'Both reports match paper') then
    raise exception 'Flag resolution was not recorded';
  end if;
end $$;
reset role;
do $$
begin
  begin
    update public.service_attendance_moves set reason = 'edited';
    raise exception 'Move history was editable';
  exception when raise_exception then
    if sqlerrm not like 'Attendance records are kept as submitted%' then raise; end if;
  end;
end $$;
