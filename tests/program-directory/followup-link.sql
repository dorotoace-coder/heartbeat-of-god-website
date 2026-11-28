-- Synthetic checks for directory-linked follow-ups. Fictional people only.
-- Run against a throwaway database: scripts/test-program-directory.sh
-- Set precreate=1 to start with an existing directory table, as hosted does.
\set ON_ERROR_STOP on
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key, email text);
create table public.profiles(id uuid primary key, role text);
create table public.outreach_workers(user_id uuid primary key references auth.users(id), full_name text);
create table public.media_vault_staff(user_id uuid);
create table public.service_attendance_access(user_id uuid, can_submit boolean);
create table public.treasury_portal_access(user_id uuid, office text);
create table public.foundation_teachers(id uuid);
create table public.member_profile_intake(email text, phone text, reviewed_at timestamptz, person_id uuid, member_type text);
create table public.mta_registrations(id uuid primary key, email text, phone text);
create table public.mta_event_attendance(registration_id uuid, reversed boolean);
-- Test stand-in for the hosted routing function.
create function public.staff_workspace() returns text language sql stable as $$ select nullif(current_setting('request.workspace',true),'') $$;
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid(), public.staff_workspace() to authenticated, anon;
grant select on public.profiles to authenticated; -- hosted grants this; the directory policy reads it

\if :{?precreate}
create table public.program_outreach_directory(import_key text primary key, display_name text not null, email text not null,
 phone_original text not null default '', programs jsonb not null, review_flags jsonb not null, provenance jsonb not null,
 email_permission text not null default 'unknown', imported_at timestamptz not null default now());
alter table public.program_outreach_directory enable row level security;
grant select on public.program_outreach_directory to authenticated;
create policy program_directory_pastor_read on public.program_outreach_directory for select to authenticated
 using (exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='owner'));
\endif

\ir ../../supabase/migrations/20261123210000_ministry_followup_board.sql
\ir ../../supabase/migrations/20261128040716_program_directory_review_evidence.sql
\ir ../../supabase/migrations/20261128050000_directory_followup_link.sql

create function public.t_check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAIL: %', label; end if; raise notice 'PASS: %', label; end $$;
-- Runs a statement and passes only if it fails with the expected SQLSTATE.
create function public.t_fails(label text, expected text, statement text) returns void language plpgsql as $$
begin
 execute statement;
 raise exception 'FAIL: % (statement succeeded)', label;
exception when others then
 if sqlstate <> expected then raise exception 'FAIL: % (got % %)', label, sqlstate, sqlerrm; end if;
 raise notice 'PASS: %', label;
end $$;
grant execute on function public.t_check(text,boolean), public.t_fails(text,text,text) to authenticated, anon;

insert into auth.users values
 ('00000000-0000-4000-8000-000000000001','owner@example.test'),
 ('00000000-0000-4000-8000-000000000002','worker@example.test'),
 ('00000000-0000-4000-8000-000000000003','other-pastor@example.test');
insert into public.profiles values ('00000000-0000-4000-8000-000000000001','owner'),('00000000-0000-4000-8000-000000000003','leader');
insert into public.outreach_workers values ('00000000-0000-4000-8000-000000000002','Example Worker');
insert into public.program_outreach_directory(import_key,display_name,email,phone_original,programs,review_flags,provenance) values
 ('k-one','Ada One','one@example.test','+1 204 555 0101','["MTA"]','[]','[]'),
 ('k-two','Ben Two','two@example.test','+1 204 555 0102','["MTA"]','[]','[]'),
 ('k-three','Cy Three','three@example.test','+1 204 555 0103','["ILPC"]','[]','[]'),
 ('k-race','Di Race','race@example.test','+1 204 555 0104','["ILPC"]','[]','[]'),
 ('k-review','Ed Review','review@example.test','+1 204 555 0105','["MTA"]','["Check spelling"]','[]');

-- Calls the function the way the app does. n is a short request id.
create function public.t_create(n int, key text, name text, permission boolean default true, worker uuid default null)
returns void language sql as $$
 select public.create_ministry_followup(('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid, name, '+1 204 555 0101', 'ministry',
  (now() at time zone 'Africa/Lagos')::date, worker, permission, key) $$;
create function public.t_close(n int, request int, outcome text) returns void language sql as $$
 select public.record_ministry_followup(('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
  ('00000000-0000-4000-8000-' || lpad(request::text,12,'0'))::uuid, outcome, 'Synthetic note', null, null) $$;
create function public.t_as(who int, workspace text) returns void language sql as $$
 select set_config('request.jwt.claim.sub', coalesce('00000000-0000-4000-8000-' || lpad(who::text,12,'0'),''), false),
  set_config('request.workspace', coalesce(workspace,''), false) $$;
grant execute on function public.t_create(int,text,text,boolean,uuid), public.t_close(int,int,text), public.t_as(int,text) to authenticated, anon;

-- Schema and grants.
select public.t_check('one create function remains', (select count(*)=1 from pg_proc where proname='create_ministry_followup'));
select public.t_check('anon cannot execute create', not has_function_privilege('anon','public.create_ministry_followup(uuid,text,text,text,date,uuid,boolean,text)','execute'));
select public.t_check('directory row security on', (select relrowsecurity from pg_class where oid='public.program_outreach_directory'::regclass));
select public.t_check('anon cannot read directory', not has_table_privilege('anon','public.program_outreach_directory','select'));

set role authenticated;
select public.t_as(1,'pastor');
-- The previous seven-argument call still works and stays unlinked.
select public.create_ministry_followup('00000000-0000-4000-8000-000000000100','Manual Person',null,'visitor',(now() at time zone 'Africa/Lagos')::date,null,true);
select public.t_check('seven-argument call stays unlinked', (select directory_import_key is null from public.ministry_followup_requests where id='00000000-0000-4000-8000-000000000100'));

-- Linked create and exact retry.
select public.t_create(101,'k-one','Ada One');
select public.t_create(101,'k-one','Ada One');
select public.t_check('linked create stores key once', (select count(*)=1 from public.ministry_followup_requests where directory_import_key='k-one'));
select public.t_fails('same request id with another contact refused','23505', $q$ select public.t_create(101,'k-two','Ben Two') $q$);
select public.t_fails('same request id without the link refused','23505', $q$ select public.t_create(101,null,'Ada One') $q$);
select public.t_fails('second open follow-up refused','HB001', $q$ select public.t_create(102,'k-one','Ada One') $q$);

-- Closing allows a new one; the history stays.
select public.t_close(201,101,'completed');
select public.t_create(103,'k-one','Ada One', true, '00000000-0000-4000-8000-000000000002');
select public.t_check('history keeps closed and new follow-up', (select count(*)=2 from public.ministry_followup_requests where directory_import_key='k-one'));

-- Declined contacts cannot be linked again.
select public.t_create(104,'k-two','Ben Two');
select public.t_close(202,104,'declined');
select public.t_fails('declined contact refused','HB004', $q$ select public.t_create(105,'k-two','Ben Two') $q$);

-- Validation.
select public.t_fails('review contact refused','HB002', $q$ select public.t_create(106,'k-review','Ed Review') $q$);
select public.t_fails('unknown contact refused','HB003', $q$ select public.t_create(107,'k-missing','Nobody') $q$);
select public.t_fails('name that differs from contact refused','HB003', $q$ select public.t_create(108,'k-three','Someone Else') $q$);
select public.t_fails('permission still required','P0001', $q$ select public.t_create(109,'k-three','Cy Three',false) $q$);

-- Workers see only assigned follow-ups, cannot read the directory or link to it.
select public.t_as(2,'evangelism');
select public.t_check('worker sees only the assigned follow-up', (select count(*)=1 from public.ministry_followup_requests));
select public.t_check('worker reads no directory rows', (select count(*)=0 from public.program_outreach_directory));
select public.t_fails('worker cannot link','42501', $q$ select public.t_create(110,'k-three','Cy Three',true,'00000000-0000-4000-8000-000000000002') $q$);
select public.t_create(111,null,'Worker Visitor',true,'00000000-0000-4000-8000-000000000002');
select public.t_check('worker manual follow-up still works', (select count(*)=2 from public.ministry_followup_requests));
select public.t_fails('direct update denied','42501', $q$ update public.ministry_followup_requests set directory_import_key='k-three' $q$);

-- Pastor workspace without the owner role cannot link; no session cannot create.
select public.t_as(3,'pastor');
select public.t_fails('non-owner pastor workspace cannot link','42501', $q$ select public.t_create(112,'k-three','Cy Three') $q$);
select public.t_as(null,null);
select public.t_fails('no session refused','42501', $q$ select public.t_create(113,null,'No Session') $q$);
reset role;

-- Database guarantees independent of the function.
select public.t_fails('index blocks a second open row','23505', $q$
 insert into public.ministry_followup_requests(id,kind,full_name,contact_permission,followup_date,recorded_by,directory_import_key)
 values('00000000-0000-4000-8000-000000000114','ministry','Ada One',true,current_date,'00000000-0000-4000-8000-000000000001','k-one') $q$);
select public.t_fails('linked contact cannot be deleted','23503', $q$ delete from public.program_outreach_directory where import_key='k-one' $q$);
