-- Synthetic checks for identity linking C2: member profile review, registrations,
-- person records and restoring earlier details. Fictional people only.
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
create table public.departments(id uuid primary key default gen_random_uuid(), name text);
create table public.congregation_people (
 id uuid primary key default gen_random_uuid(), full_name text not null check (length(trim(full_name)) between 1 and 160),
 phone text, address text, social_contact text, first_visit date, requests_school boolean not null default false,
 created_by uuid not null default auth.uid() references auth.users, created_at timestamptz not null default now());
create function public.staff_workspace() returns text language sql stable as $$ select nullif(current_setting('request.workspace',true),'') $$;
create table public.outreach_workers(user_id uuid primary key references auth.users(id), full_name text);
create table public.media_vault_staff(user_id uuid);
create table public.service_attendance_access(user_id uuid, can_submit boolean);
create table public.treasury_portal_access(user_id uuid, office text);
create table public.foundation_teachers(id uuid);
create table public.mta_registrations(id uuid primary key, full_name text not null, email text, phone text, created_at timestamptz default now());
create table public.mta_event_attendance(registration_id uuid, reversed boolean);
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid(), public.staff_workspace() to authenticated, anon;
grant select on public.profiles, public.congregation_people to authenticated;
grant update (full_name, phone, address, social_contact) on public.congregation_people to authenticated;

\ir ../../supabase/migrations/20261123210000_ministry_followup_board.sql
\ir ../../supabase/migrations/20261126163836_member_profile_intake.sql
\ir ../../supabase/migrations/20261128040716_program_directory_review_evidence.sql
\ir ../../supabase/migrations/20261128043416_directory_followup_link.sql
\ir ../../supabase/migrations/20261128045844_person_source_links.sql

create function public.t_id(n int) returns uuid language sql immutable as $$ select ('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid $$;
grant execute on function public.t_id(int) to authenticated, anon;
insert into auth.users values (public.t_id(1),'owner@example.test'),(public.t_id(2),'leader@example.test'),
 (public.t_id(11),'ada@example.test'),(public.t_id(12),'ben@example.test'),(public.t_id(13),'legacy@example.test');
insert into public.profiles values (public.t_id(1),'owner'),(public.t_id(2),'leader');
-- A profile reviewed before the link log existed.
insert into public.congregation_people(id,full_name,created_by) values (public.t_id(500),'Legacy Person',public.t_id(1));
insert into public.member_profile_intake(user_id,full_name,email,member_type,reviewed_at,person_id)
 values (public.t_id(13),'Legacy Person','legacy@example.test','member',now(),public.t_id(500));

\ir ../../supabase/migrations/20261128051355_person_links_members_registrations.sql

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
create function public.t_as(who int, workspace text default 'pastor') returns void language sql as $$
 select set_config('request.jwt.claim.sub', coalesce(public.t_id(who)::text,''), false),
  set_config('request.workspace', coalesce(workspace,''), false) $$;
create function public.t_profile(who int, name text, phone text, kind text) returns void language plpgsql as $$
begin
 perform public.t_as(who, null);
 perform public.save_my_member_profile(name, phone, '', kind, null, false, false);
 perform public.t_as(1);
end $$;
create function public.t_link(n int, source text, key text, person uuid, evidence text[] default array['confirmed_in_person'])
returns uuid language sql as $$ select public.person_link(public.t_id(n), source, key, person, evidence, null, true) $$;
create function public.t_member_link(account int) returns public.person_source_links language sql as $$
 select * from public.person_source_links where source_type='member_profile' and source_key=public.t_id(account)::text and unlinked_at is null $$;
grant execute on function public.t_check(text,boolean), public.t_fails(text,text,text), public.t_as(int,text),
 public.t_profile(int,text,text,text), public.t_link(int,text,text,uuid,text[]), public.t_member_link(int) to authenticated, anon;

insert into public.program_outreach_directory(import_key,display_name,email,phone_original,programs,review_flags,provenance) values
 ('k-ada','Ada Example','ada.programs@example.test','+1 204 555 0101','["MTA","ILPC"]','[]','[]'),
 ('k-ben','Ben Example','ben@example.test','+1 204 555 0102','["MTA"]','[]','[]');
insert into public.mta_registrations(id,full_name,email,phone,created_at) values
 (public.t_id(601),'Ada Example','ADA.programs@example.test','1 (204) 555-0101','2026-07-01'),
 (public.t_id(602),'Ada E','ada.programs@example.test','999','2026-07-02'),
 (public.t_id(603),'Someone Else','other@example.test','+1 204 555 0103','2026-07-03');
insert into public.congregation_people(id,full_name,phone,created_by) values (public.t_id(501),'Ben Example','204-555-0102',public.t_id(1));
create table public.before_reg as select id, md5(r::text) h from public.mta_registrations r;
grant select on public.before_reg to authenticated;

select public.t_check('earlier review backfilled into the log', (select count(*)=1 from public.person_source_links
 where source_type='member_profile' and source_key=public.t_id(13)::text and person_id=public.t_id(500) and evidence=array['profile_review']));
select public.t_check('anon cannot run the new functions', not has_function_privilege('anon','public.person_records(uuid)','execute')
 and not has_function_privilege('anon','public.person_restore(bigint)','execute') and not has_function_privilege('anon','public.person_registrations(text)','execute')
 and not has_function_privilege('anon','public.review_member_profile(uuid,uuid)','execute'));

set role authenticated;
-- Member profile review: owner only.
select public.t_profile(11,'Ada Example','+1 204 555 0101','member');
select public.t_profile(12,'Ben Example','+1 204 555 0177','member');
select public.t_as(2,'pastor');
select public.t_fails('pastor workspace without the owner role cannot review','42501', $q$ select public.review_member_profile(public.t_id(11),null) $q$);
select public.t_as(11,null);
select public.t_fails('member cannot review own profile','42501', $q$ select public.review_member_profile(public.t_id(11),null) $q$);

-- New person from a profile: logged once, repeat review keeps one link.
select public.t_as(1);
select public.review_member_profile(public.t_id(11),null);
select public.t_check('profile review creates a logged link', (select evidence=array['profile_review'] from public.t_member_link(11)));
select public.t_profile(11,'Ada Example','+1 204 555 0109','member');
select public.review_member_profile(public.t_id(11),null);
select public.t_check('repeat review keeps one active link', (select count(*)=1 from public.person_source_links where source_type='member_profile' and source_key=public.t_id(11)::text));
select public.t_check('repeat review saves the earlier phone', (select count(*)=1 and min(phone)='+1 204 555 0101' from public.person_revisions
 where person_id=(select person_id from public.t_member_link(11))));

-- Existing person: evidence records what matched before the details were replaced.
select public.t_fails('a person linked to another account is refused','P0001', $q$ select public.review_member_profile(public.t_id(12),public.t_id(500)) $q$);
select public.review_member_profile(public.t_id(12),public.t_id(501));
select public.t_check('evidence records the name match', (select evidence=array['profile_review','same_name'] from public.t_member_link(12)));

-- Unlinking a profile link returns the profile to review and keeps the person.
select public.person_unlink((select id from public.t_member_link(12)),'Wrong person chosen');
select public.t_check('profile back in the review queue', (select person_id is null and reviewed_at is null from public.member_profile_intake where user_id=public.t_id(12)));
select public.t_check('person kept after unlink', (select count(*)=1 from public.congregation_people where id=public.t_id(501)));
select public.review_member_profile(public.t_id(12),public.t_id(501));
select public.t_check('relinking keeps both rows', (select count(*)=2 from public.person_source_links where source_type='member_profile' and source_key=public.t_id(12)::text));
select public.t_fails('profiles cannot be linked through person_link','22023', $q$ select public.t_link(700,'member_profile',public.t_id(12)::text,public.t_id(501)) $q$);

-- Registrations sharing a contact's email, matched without case.
select public.t_check('registrations found by email, phone compared',
 (select array_agg(registration_id order by registered_at)=array[public.t_id(601),public.t_id(602)] and array_agg(same_phone order by registered_at)=array[true,false]
  from public.person_registrations('k-ada')));
select public.t_link(701,'mta_registration',public.t_id(601)::text,(select person_id from public.t_member_link(11)),array['same_email','same_phone']);
select public.t_check('registration shows its linked person', (select linked_person=(select person_id from public.t_member_link(11)) and link_id=public.t_id(701)
 from public.person_registrations('k-ada') where registration_id=public.t_id(601)));
select public.t_fails('registration cannot be linked twice','HB011', $q$ select public.t_link(702,'mta_registration',public.t_id(601)::text,null) $q$);
select public.t_fails('unknown registration refused','HB013', $q$ select public.t_link(703,'mta_registration',public.t_id(999)::text,null) $q$);
select public.t_link(704,'mta_registration',public.t_id(602)::text,null);
select public.t_check('new person from a registration uses its name', (select count(*)=1 from public.congregation_people where full_name='Ada E' and origin='program_directory'));

-- Membership through a reviewed link, even with a different email.
select public.t_check('before linking: different email means unconfirmed', (select relationship='unconfirmed' and not member_match from public.program_directory_current() where import_key='k-ada'));
select public.t_link(705,'directory_contact','k-ada',(select person_id from public.t_member_link(11)));
select public.t_check('after linking: member through the person', (select relationship='member' and member_match from public.program_directory_current() where import_key='k-ada'));
-- A different phone no longer needs review once the member is the linked person.
select public.t_check('before linking: same email, different phone needs review', (select relationship='review' and review_reasons=array['member_details_differ'] from public.program_directory_current() where import_key='k-ben'));
select public.t_link(706,'directory_contact','k-ben',(select person_id from public.t_member_link(12)));
select public.t_check('after linking: member, no review', (select relationship='member' and review_reasons='{}' from public.program_directory_current() where import_key='k-ben'));

-- A person's records, newest first, including follow-ups of linked contacts.
select public.create_ministry_followup(public.t_id(800),'Ada Example',null,'ministry',(now() at time zone 'Africa/Lagos')::date,null,true,'k-ada');
select public.t_check('records list every linked source and the follow-up', (select array_agg(distinct record_kind order by record_kind)
 =array['directory_contact','followup','member_profile','mta_registration'] from public.person_records((select person_id from public.t_member_link(11)))));
select public.t_check('open follow-up described', (select detail like 'open, next contact %' from public.person_records((select person_id from public.t_member_link(11))) where record_kind='followup'));
select public.t_check('directory record shows its programs', (select detail='MTA, ILPC' from public.person_records((select person_id from public.t_member_link(11))) where record_kind='directory_contact'));

-- Restore earlier details; the replaced details are kept too.
select public.person_restore((select id from public.person_revisions where person_id=(select person_id from public.t_member_link(11))));
select public.t_check('earlier phone restored', (select phone='+1 204 555 0101' from public.congregation_people where id=(select person_id from public.t_member_link(11))));
select public.t_check('restore keeps what it replaced', (select count(*)=2 from public.person_revisions where person_id=(select person_id from public.t_member_link(11))));
select public.t_fails('unknown revision refused','HB017', $q$ select public.person_restore(999999) $q$);

-- Leaders get nothing.
select public.t_as(2,'pastor');
select public.t_fails('leader cannot read records','42501', $q$ select * from public.person_records(public.t_id(500)) $q$);
select public.t_fails('leader cannot list registrations','42501', $q$ select * from public.person_registrations('k-ada') $q$);
select public.t_fails('leader cannot restore','42501', $q$ select public.person_restore(1) $q$);
select public.t_fails('leader cannot link registrations','42501', $q$ select public.t_link(707,'mta_registration',public.t_id(603)::text,null) $q$);
reset role;
select public.t_check('registrations themselves unchanged', not exists(select 1 from public.mta_registrations r join public.before_reg b using(id) where md5(r::text)<>b.h));
