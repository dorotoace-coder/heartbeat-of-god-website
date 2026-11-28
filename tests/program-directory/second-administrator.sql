-- Synthetic checks: a second administrator opens the Pastor workspace but never Treasury.
-- Run: PG_CONTAINER=<local postgres container> bash scripts/test-program-directory.sh
\set ON_ERROR_STOP on
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz default now(), last_sign_in_at timestamptz);
create type public.app_role as enum ('owner','pastor','manager','leader');
create table public.profiles(id uuid primary key, full_name text, role public.app_role);
create table public.outreach_workers(user_id uuid primary key, full_name text not null);
create table public.media_vault_staff(user_id uuid primary key);
create table public.service_attendance_access(user_id uuid primary key, can_submit boolean not null default false);
create table public.foundation_teachers(id uuid primary key, full_name text not null, trained_on date not null);
create table public.treasury_portal_access(church_id uuid not null, office text not null, user_id uuid not null, primary key (church_id, office), unique (church_id, user_id));
-- Treasury and partnership rules exactly as hosted: they check the Treasury seat tables, not the workspace.
create type public.treasury_role as enum ('admin','approver','viewer');
create table public.treasury_members(church_id uuid, user_id uuid, role public.treasury_role, active boolean default true);
create function public.treasury_has_role(p_church uuid, p_roles public.treasury_role[]) returns boolean language sql stable security definer set search_path='' as $$
  select exists (select 1 from public.treasury_members m join public.treasury_portal_access a using (church_id, user_id)
   where m.church_id = p_church and m.user_id = (select auth.uid()) and m.active and m.role = any (p_roles)) $$;
create function public.partnership_officer() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.treasury_portal_access where user_id=auth.uid() and office in ('pastor','treasury_leader')) $$;
create table public.treasury_income(id int primary key, church_id uuid, amount numeric);
alter table public.treasury_income enable row level security;
create policy income_read on public.treasury_income for select to authenticated using (public.treasury_has_role(church_id, array['admin','approver']::public.treasury_role[]));
create table public.congregation_people(id int primary key, full_name text);
alter table public.congregation_people enable row level security;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
grant select on public.profiles, public.treasury_income, public.congregation_people, public.treasury_portal_access to authenticated;
grant execute on function public.treasury_has_role(uuid, public.treasury_role[]), public.partnership_officer() to authenticated;

\ir ../../supabase/migrations/20261128110000_second_administrator.sql

create policy people_pastor_read on public.congregation_people for select to authenticated using ((select public.staff_workspace())='pastor');
create function public.t_check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAIL: %', label; end if; raise notice 'PASS: %', label; end $$;
create function public.t_id(n int) returns uuid language sql immutable as $$ select ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid $$;
create function public.t_as(who int) returns void language sql as $$ select set_config('request.jwt.claim.sub', coalesce(public.t_id(who)::text,''), false) $$;
grant execute on function public.t_check(text,boolean), public.t_id(int), public.t_as(int), public.staff_workspace(), public.pastor_staff_access() to authenticated;

insert into auth.users(id,email) values (public.t_id(1),'pastor@example.test'),(public.t_id(2),'admin@example.test'),(public.t_id(3),'media@example.test'),(public.t_id(4),'treasurer@example.test');
-- The Pastor holds the Treasury Pastor seat; the second administrator also serves in Media.
insert into public.profiles values (public.t_id(1),'Pastor','owner'),(public.t_id(2),'Second Admin','owner'),(public.t_id(3),'Media Person','leader'),(public.t_id(4),'Treasurer','leader');
insert into public.treasury_portal_access values (public.t_id(900),'pastor',public.t_id(1)),(public.t_id(900),'treasury_leader',public.t_id(4));
insert into public.treasury_members values (public.t_id(900),public.t_id(1),'admin',true),(public.t_id(900),public.t_id(4),'approver',true);
insert into public.media_vault_staff values (public.t_id(2)),(public.t_id(3));
insert into public.treasury_income values (1, public.t_id(900), 100);
insert into public.congregation_people values (1,'Example Person');

set role authenticated;
select public.t_as(1);
select public.t_check('Pastor still opens the Pastor workspace', public.staff_workspace()='pastor');
select public.t_check('Pastor still reads Treasury', (select count(*)=1 from public.treasury_income));
select public.t_as(2);
select public.t_check('second administrator opens the Pastor workspace (ahead of Media)', public.staff_workspace()='pastor');
select public.t_check('second administrator reads people', (select count(*)=1 from public.congregation_people));
select public.t_check('second administrator reads no Treasury income', (select count(*)=0 from public.treasury_income));
select public.t_check('second administrator holds no Treasury role', not public.treasury_has_role(public.t_id(900), array['admin','approver','viewer']::public.treasury_role[]));
select public.t_check('second administrator is not a partnership officer', not public.partnership_officer());
select public.t_check('second administrator sees no Treasury seat row of their own', (select count(*)=0 from public.treasury_portal_access where user_id=public.t_id(2)));
select public.t_check('staff list shows the administrator', (select department='administrator' from public.pastor_staff_access() where user_id=public.t_id(2)));
select public.t_check('staff list keeps the Pastor first', (select department='pastor' from public.pastor_staff_access() limit 1));
select public.t_as(3);
select public.t_check('a leader in Media keeps the Media workspace', public.staff_workspace()='media');
select public.t_check('a leader sees no staff list', (select count(*)=0 from public.pastor_staff_access()));
select public.t_as(4);
select public.t_check('Treasury Leader keeps the Treasury workspace', public.staff_workspace()='treasury');
reset role;
