begin;

alter table public.service_attendance_access add column can_schedule boolean not null default false;

create table public.pulse_services (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 100),
  service_date date not null,
  service_time time(0) not null check (service_time < time '24:00' and extract(second from service_time) = 0),
  unique (service_date, service_time)
);

alter table public.pulse_services enable row level security;
revoke all on public.pulse_services from anon, authenticated;
grant select on public.pulse_services to authenticated;
grant insert (title, service_date, service_time) on public.pulse_services to authenticated;
create policy pulse_services_schedule on public.pulse_services
  for insert to authenticated with check (
    exists (select 1 from public.service_attendance_access
      where user_id = (select auth.uid()) and can_schedule)
  );
create policy pulse_services_read on public.pulse_services
  for select to authenticated using (
    exists (select 1 from public.service_attendance_access where user_id = (select auth.uid()))
    or exists (select 1 from public.treasury_portal_access where user_id = (select auth.uid()))
  );

-- The composite reference preserves the existing report key and ensures
-- an attendance record cannot be saved for an unscheduled occurrence.
alter table public.service_attendance add constraint attendance_scheduled_service
  foreign key (service_date, service_time)
  references public.pulse_services (service_date, service_time) not valid;

-- Older Treasury records retain their original labels.
alter table public.treasury_income add column pulse_service_id uuid
  references public.pulse_services (id);
create index treasury_income_pulse_service on public.treasury_income (pulse_service_id);

create function public.set_treasury_service_details() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  if new.pulse_service_id is not null then
    select s.service_date, s.title into strict new.entry_date, new.service
    from public.pulse_services s where s.id = new.pulse_service_id;
  end if;
  return new;
end;
$$;

create trigger treasury_income_service_details before insert on public.treasury_income
  for each row execute function public.set_treasury_service_details();

commit;
