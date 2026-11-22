-- Credentials are entered through the authorized workspace, never seeded in source.
create table public.live_meetings (
  program text primary key check (program ~ '^[a-z][a-z0-9-]{0,63}$'),
  title text not null check (length(title) between 1 and 120),
  audience text not null default 'restricted' check (audience in ('public','restricted')),
  status text not null default 'inactive' check (status in ('active','inactive','upcoming')),
  invitation_url text,
  check (audience <> 'public' or program <> 'leadership'),
  check (invitation_url is null or invitation_url ~ '^https://([a-z0-9-]+\.)?zoom\.us/j/[0-9]+\?pwd=[A-Za-z0-9._~%-]+$'),
  check (status <> 'active' or invitation_url is not null)
);
alter table public.live_meetings enable row level security;
revoke all on public.live_meetings from anon, authenticated;
grant select, insert, update on public.live_meetings to authenticated;
create policy live_meetings_pastor on public.live_meetings for all to authenticated
using ((select public.staff_workspace()) = 'pastor')
with check ((select public.staff_workspace()) = 'pastor');

insert into public.live_meetings(program,title,audience) values
('sunday','Sunday service','public'),
('morning-devotion','Morning devotion','restricted'),
('leadership','Leadership meeting','restricted');

-- Deliberately narrow public projections: no arbitrary program or private URL lookup.
create function public.public_live_meeting() returns jsonb
language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('title',title,'status',status)
 from public.live_meetings where program='sunday' and audience='public';
$$;
create function public.public_live_join() returns text
language sql stable security definer set search_path = '' as $$
 select invitation_url from public.live_meetings
 where program='sunday' and audience='public' and status='active';
$$;
revoke all on function public.public_live_meeting() from public;
revoke all on function public.public_live_join() from public;
grant execute on function public.public_live_meeting() to anon, authenticated;
grant execute on function public.public_live_join() to anon, authenticated;
