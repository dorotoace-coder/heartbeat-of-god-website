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
