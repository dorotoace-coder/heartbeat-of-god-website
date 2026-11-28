-- Synthetic checks for person links (identity linking C1). Fictional people only.
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
 id uuid primary key default gen_random_uuid(),
 full_name text not null check (length(trim(full_name)) between 1 and 160),
 phone text, address text, social_contact text, first_visit date, requests_school boolean not null default false,
 created_by uuid not null default auth.uid() references auth.users, created_at timestamptz not null default now());
create table public.member_profile_intake(user_id uuid primary key, email text not null, phone text, reviewed_at timestamptz,
 person_id uuid unique references public.congregation_people, member_type text);
create table public.program_outreach_directory(import_key text primary key, display_name text not null, email text not null,
 phone_original text not null default '', programs jsonb not null default '[]', review_flags jsonb not null default '[]',
 provenance jsonb not null default '[]', email_permission text not null default 'unknown', imported_at timestamptz not null default now());
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
grant select on public.profiles, public.congregation_people to authenticated;
grant update (full_name, phone, address, social_contact) on public.congregation_people to authenticated;

\ir ../../supabase/migrations/20261128045844_person_source_links.sql

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
create function public.t_as(who int) returns void language sql as $$
 select set_config('request.jwt.claim.sub', coalesce(public.t_id(who)::text,''), false) $$;
create function public.t_link(n int, key text, person uuid, evidence text[] default array['confirmed_in_person'], checked boolean default true)
returns uuid language sql as $$ select public.person_link(public.t_id(n), 'directory_contact', key, person, evidence, 'Synthetic note', checked) $$;
grant execute on function public.t_check(text,boolean), public.t_fails(text,text,text), public.t_id(int), public.t_as(int),
 public.t_link(int,text,uuid,text[],boolean) to authenticated, anon;

insert into auth.users values (public.t_id(1),'owner@example.test'),(public.t_id(2),'leader@example.test');
insert into public.profiles values (public.t_id(1),'owner'),(public.t_id(2),'leader');
insert into public.program_outreach_directory(import_key,display_name,email,phone_original) values
 ('k-ada','Ada Example','ada@example.test','+1 204 555 0101'),
 ('k-ada-2','Ada E.','ada@example.test','+1 204 555 0199'),
 ('k-ben','Ben Example','ben@example.test','(204) 555-0102'),
 ('k-cy','Cy Example','cy@example.test','');
-- A staff-entered person who shares Ben's phone and Cy's name.
insert into public.congregation_people(id, full_name, phone, created_by) values (public.t_id(500),'Cy Example','204.555.0102',public.t_id(1));
create temp table before_links as select import_key, md5(t::text) h from public.program_outreach_directory t;
grant select on before_links to authenticated;

select public.t_check('staff-entered person keeps origin staff', (select origin='staff' from public.congregation_people where id=public.t_id(500)));
select public.t_check('anon cannot run person_link', not has_function_privilege('anon','public.person_link(uuid,text,text,uuid,text[],text,boolean)','execute'));
select public.t_check('helper not callable directly', not has_function_privilege('authenticated','public.require_person_owner()','execute'));

set role authenticated;
-- Owner only.
select public.t_as(2);
select public.t_fails('leader cannot list candidates','42501', $q$ select * from public.person_candidates('directory_contact','k-ada') $q$);
select public.t_fails('leader cannot link','42501', $q$ select public.t_link(100,'k-ada',null) $q$);
select public.t_as(null);
select public.t_fails('no session cannot link','42501', $q$ select public.t_link(100,'k-ada',null) $q$);

select public.t_as(1);
-- Validation.
select public.t_fails('identity check required','HB014', $q$ select public.t_link(100,'k-ada',null,array['same_email'],false) $q$);
select public.t_fails('evidence required','HB014', $q$ select public.t_link(100,'k-ada',null,array[]::text[]) $q$);
select public.t_fails('unknown evidence refused','HB014', $q$ select public.t_link(100,'k-ada',null,array['guess']) $q$);
select public.t_fails('unknown contact refused','HB013', $q$ select public.t_link(100,'k-missing',null) $q$);
select public.t_fails('unknown person refused','HB012', $q$ select public.t_link(100,'k-ada',public.t_id(999)) $q$);
select public.t_fails('other source types not open yet','22023', $q$ select public.person_link(public.t_id(100),'mta_registration','x',null,array['same_email'],null,true) $q$);
select public.t_check('refusals created nothing', (select count(*)=1 from public.congregation_people) and (select count(*)=0 from public.person_source_links));

-- Link to a new person, then retry.
select public.t_link(100,'k-ada',null);
select public.t_link(100,'k-ada',null);
select public.t_check('new person created once from the contact', (select count(*)=1 from public.congregation_people
 where origin='program_directory' and full_name='Ada Example' and phone='+1 204 555 0101'));
select public.t_check('one active link', (select count(*)=1 from public.person_source_links where source_key='k-ada' and unlinked_at is null));
select public.t_fails('same request id for another contact refused','23505', $q$ select public.t_link(100,'k-ben',null) $q$);
select public.t_fails('second link for the same contact refused','HB011', $q$ select public.t_link(101,'k-ada',null) $q$);

-- Candidates explain themselves and never choose.
select public.t_check('shared email suggests the linked person', (select reasons=array['same_email'] from public.person_candidates('directory_contact','k-ada-2')
 where full_name='Ada Example'));
select public.t_check('same phone and same name each suggest the staff person', (select count(*)=1 from public.person_candidates('directory_contact','k-ben')
 where person_id=public.t_id(500) and reasons=array['same_phone']) and (select reasons=array['same_name'] from public.person_candidates('directory_contact','k-cy')));
select public.t_check('no evidence, no candidates', (select count(*)=0 from public.person_candidates('directory_contact','k-ada')
 where person_id=public.t_id(500)));

-- Link a second contact to an existing person.
select public.t_link(102,'k-ada-2',(select person_id from public.person_source_links where source_key='k-ada'),array['same_email','confirmed_by_message']);
select public.t_check('person has two linked contacts', (select active_links=2 from public.person_candidates('directory_contact','k-ada-2') where full_name='Ada Example'));

-- Unlink with a reason; retry; relink keeps history.
select public.person_unlink(public.t_id(102),'Different person, same family email');
select public.person_unlink(public.t_id(102),'Different person, same family email');
select public.t_fails('unlinking again with another reason refused','HB016', $q$ select public.person_unlink(public.t_id(102),'Other reason') $q$);
select public.t_fails('unlink needs a reason','HB014', $q$ select public.person_unlink(public.t_id(100),'  ') $q$);
select public.t_fails('unknown link','HB015', $q$ select public.person_unlink(public.t_id(999),'x') $q$);
select public.t_link(103,'k-ada-2',null,array['confirmed_in_person']);
select public.t_check('relink after unlink keeps both rows', (select count(*)=2 from public.person_source_links where source_key='k-ada-2')
 and (select count(*)=1 from public.person_source_links where source_key='k-ada-2' and unlinked_at is null));
select public.t_check('person survives unlink', (select count(*)=3 from public.congregation_people));

-- History of person details.
update public.congregation_people set phone='+1 204 555 0111' where id=public.t_id(500);
update public.congregation_people set phone='+1 204 555 0111' where id=public.t_id(500);
select public.t_check('change saves the earlier value once', (select count(*)=1 and min(phone)='204.555.0102' from public.person_revisions where person_id=public.t_id(500)));
select public.t_check('revision records who changed it', (select replaced_by=public.t_id(1) from public.person_revisions where person_id=public.t_id(500)));

-- Direct writes are closed.
select public.t_fails('direct link insert denied','42501', $q$ insert into public.person_source_links(id,person_id,source_type,source_key,evidence,linked_by)
 values(public.t_id(200),public.t_id(500),'directory_contact','k-cy',array['same_name'],public.t_id(1)) $q$);
select public.t_fails('direct revision delete denied','42501', $q$ delete from public.person_revisions $q$);
select public.t_fails('origin cannot be edited directly','42501', $q$ update public.congregation_people set origin='staff' $q$);

-- Leaders see neither links nor revisions.
select public.t_as(2);
select public.t_check('leader reads no links or revisions', (select count(*)=0 from public.person_source_links) and (select count(*)=0 from public.person_revisions));
reset role;

select public.t_check('directory rows unchanged by linking', not exists(
 select 1 from public.program_outreach_directory t join before_links b using(import_key) where md5(t::text)<>b.h));
