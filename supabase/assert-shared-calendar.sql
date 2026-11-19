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
