begin;

create table public.service_attendance_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  can_submit boolean not null default false
);

alter table public.service_attendance_access enable row level security;
revoke all on public.service_attendance_access from anon, authenticated;
grant select on public.service_attendance_access to authenticated;
create policy attendance_access_self on public.service_attendance_access
  for select to authenticated using (user_id = (select auth.uid()));

create table public.service_attendance (
  service_date date not null,
  service_time time(0) not null check (extract(second from service_time) = 0),
  location text not null default 'Akute' check (location = 'Akute'),
  men integer not null check (men between 0 and 100000),
  women integer not null check (women between 0 and 100000),
  children integer not null check (children between 0 and 100000),
  first_timers integer not null check (first_timers between 0 and men + women + children),
  submitted_by uuid not null default auth.uid(),
  submitted_at timestamptz not null default now(),
  primary key (location, service_date, service_time)
);

alter table public.service_attendance enable row level security;
revoke all on public.service_attendance from anon, authenticated;
grant select (service_date, service_time, location, men, women, children, first_timers, submitted_at)
  on public.service_attendance to authenticated;
grant insert (service_date, service_time, men, women, children, first_timers)
  on public.service_attendance to authenticated;

create policy attendance_read on public.service_attendance
  for select to authenticated using (exists (
    select 1 from public.service_attendance_access where user_id = (select auth.uid())
  ));

create policy attendance_submit on public.service_attendance
  for insert to authenticated with check (
    submitted_by = (select auth.uid())
    and exists (
      select 1 from public.service_attendance_access
      where user_id = (select auth.uid()) and can_submit
    )
  );

commit;
