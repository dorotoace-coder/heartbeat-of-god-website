-- Synthetic checks for contact permissions (C4 part 1). Fictional people only.
-- Run: PG_CONTAINER=<local postgres container> bash scripts/test-program-directory.sh
\set ON_ERROR_STOP on
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key, email text);
create table public.profiles(id uuid primary key, role text);
create table public.congregation_people (
 id uuid primary key default gen_random_uuid(), full_name text not null, phone text, address text, social_contact text,
 first_visit date, requests_school boolean not null default false,
 created_by uuid not null default auth.uid() references auth.users, created_at timestamptz not null default now());
create table public.member_profile_intake(user_id uuid primary key, email text not null, phone text, reviewed_at timestamptz,
 person_id uuid unique references public.congregation_people, member_type text);
create table public.program_outreach_directory(import_key text primary key, display_name text not null, email text not null,
 phone_original text not null default '', programs jsonb not null default '[]', review_flags jsonb not null default '[]',
 provenance jsonb not null default '[]', email_permission text not null default 'unknown', imported_at timestamptz not null default now());
create table public.email_suppressions(email text primary key, reason text not null, source text, created_at timestamptz not null default now());
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
grant select on public.profiles, public.congregation_people to authenticated;

\ir ../../supabase/migrations/20261128045844_person_source_links.sql
\ir ../../supabase/migrations/20261128061542_contact_permissions.sql

create function public.t_check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAIL: %', label; end if; raise notice 'PASS: %', label; end $$;
create function public.t_fails(label text, expected text, statement text) returns void language plpgsql as $$
begin
 execute statement;
 raise exception 'FAIL: % (statement succeeded)', label;
exception when others then
 if sqlstate <> expected then raise exception 'FAIL: % (got % %)', label, sqlstate, sqlerrm; end if;
 raise notice 'PASS: %', label;
end $$;
create function public.t_id(n int) returns uuid language sql immutable as $$ select ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid $$;
create function public.t_as(who int) returns void language sql as $$ select set_config('request.jwt.claim.sub', coalesce(public.t_id(who)::text,''), false) $$;
create function public.t_grant(n int, address text, purposes text[], method text default 'in_person',
 wording text default 'May we email you invitations to ministry events?', checked boolean default true)
returns void language sql as $$ select public.permission_record(public.t_id(n), address, purposes, 'granted', method, wording, null, null, checked) $$;
create function public.t_withdraw(n int, address text, purposes text[]) returns void language sql as $$
 select public.permission_record(public.t_id(n), address, purposes, 'withdrawn', 'owner_recorded', null, 'Asked to stop', null, false) $$;
create function public.t_allowed(address text, purpose text) returns boolean language sql as $$
 select allowed from public.permission_status(array[address]) where purpose=$2 $$;
grant execute on function public.t_check(text,boolean), public.t_fails(text,text,text), public.t_id(int), public.t_as(int),
 public.t_grant(int,text,text[],text,text,boolean), public.t_withdraw(int,text,text[]), public.t_allowed(text,text) to authenticated, anon;

insert into auth.users values (public.t_id(1),'owner@example.test'),(public.t_id(2),'leader@example.test');
insert into public.profiles values (public.t_id(1),'owner'),(public.t_id(2),'leader');

select public.t_check('anon cannot record or read permissions', not has_function_privilege('anon','public.permission_record(uuid,text,text[],text,text,text,text,uuid,boolean)','execute')
 and not has_function_privilege('anon','public.permission_status(text[])','execute') and not has_table_privilege('anon','public.contact_permissions','select'));
select public.t_check('no client can write the log directly', not has_table_privilege('authenticated','public.contact_permissions','insert')
 and not has_table_privilege('authenticated','public.contact_permissions','update') and not has_table_privilege('authenticated','public.contact_permissions','delete'));

set role authenticated;
select public.t_as(2);
select public.t_fails('leader cannot record','42501', $q$ select public.t_grant(100,'ada@example.test',array['event_invitation']) $q$);
select public.t_fails('leader cannot read status','42501', $q$ select * from public.permission_status(array['ada@example.test']) $q$);

select public.t_as(1);
-- Unknown stays unknown.
select public.t_check('no record means not allowed', (select bool_and(decision is null and not allowed) and count(*)=3 from public.permission_status(array['ada@example.test'])));

-- Grants need the question asked, how they agreed and an identity check.
select public.t_fails('grant without identity check refused','HB022', $q$ select public.t_grant(101,'ada@example.test',array['event_invitation'],'in_person','May we email you invitations?',false) $q$);
select public.t_fails('grant without wording refused','HB022', $q$ select public.t_grant(101,'ada@example.test',array['event_invitation'],'in_person',null) $q$);
select public.t_fails('grant recorded by owner alone refused','HB022', $q$ select public.t_grant(101,'ada@example.test',array['event_invitation'],'owner_recorded') $q$);
select public.t_fails('unknown purpose refused','HB021', $q$ select public.t_grant(101,'ada@example.test',array['partnership']) $q$);
select public.t_fails('repeated purpose refused','HB021', $q$ select public.t_grant(101,'ada@example.test',array['greetings','greetings']) $q$);
select public.t_fails('bad address refused','HB021', $q$ select public.t_grant(101,'not-an-address',array['greetings']) $q$);
select public.t_check('refusals wrote nothing', (select count(*)=0 from public.contact_permissions));

-- A grant applies to the purposes asked about, case-insensitive address, retry safe.
select public.t_grant(102,'  Ada@Example.TEST ',array['event_invitation','greetings']);
select public.t_grant(102,'  Ada@Example.TEST ',array['event_invitation','greetings']);
select public.t_check('grant stored once per purpose', (select count(*)=2 from public.contact_permissions));
select public.t_check('granted purposes allowed', public.t_allowed('ada@example.test','event_invitation') and public.t_allowed('ada@example.test','greetings'));
select public.t_check('other purpose still not allowed', not public.t_allowed('ada@example.test','ministry_news'));
select public.t_fails('same request id with other details refused','23505', $q$ select public.t_grant(102,'ada@example.test',array['ministry_news']) $q$);

-- Withdrawal wins, needs no identity check, and keeps history.
select public.t_withdraw(103,'ada@example.test',array['event_invitation']);
select public.t_check('withdrawn purpose no longer allowed', not public.t_allowed('ada@example.test','event_invitation'));
select public.t_check('other granted purpose unaffected', public.t_allowed('ada@example.test','greetings'));
select public.t_check('history kept', (select count(*)=3 from public.contact_permissions where address='ada@example.test'));
-- A later grant can restore it.
select public.t_grant(104,'ada@example.test',array['event_invitation'],'reply_message','Would you like invitations to our events again?');
select public.t_check('later grant allows again', public.t_allowed('ada@example.test','event_invitation'));

-- The existing suppression list blocks everything.
reset role;
insert into public.email_suppressions values ('ada@example.test','opt_out','Synthetic STOP reply');
set role authenticated;
select public.t_as(1);
select public.t_check('suppression blocks every purpose', (select bool_and(suppressed and not allowed) from public.permission_status(array['ada@example.test'])));

-- Status for many addresses at once, with unknown rows included.
select public.t_check('batch status returns every address and purpose', (select count(*)=6 from public.permission_status(array['ada@example.test','ben@example.test'])));
select public.t_fails('direct insert denied','42501', $q$ insert into public.contact_permissions(request_id,address,purpose,decision,method,recorded_by)
 values(public.t_id(200),'x@example.test','greetings','granted','in_person',public.t_id(1)) $q$);
select public.t_fails('direct delete denied','42501', $q$ delete from public.contact_permissions $q$);
select public.t_as(2);
select public.t_check('leader reads no log rows', (select count(*)=0 from public.contact_permissions));
reset role;
select public.t_check('directory permission column untouched', (select count(*)=0 from public.program_outreach_directory where email_permission<>'unknown'));
