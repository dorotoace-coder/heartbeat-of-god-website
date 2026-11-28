-- Synthetic checks for program_directory_current(). Fictional people only.
-- Run against a throwaway database: scripts/test-program-directory.sh
\set ON_ERROR_STOP on
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key, email text);
create table public.profiles(id uuid primary key, role text);
create table public.outreach_workers(user_id uuid);
create table public.media_vault_staff(user_id uuid);
create table public.service_attendance_access(user_id uuid, can_submit boolean);
create table public.treasury_portal_access(user_id uuid, office text);
create table public.foundation_teachers(id uuid);
create table public.member_profile_intake(email text, phone text, reviewed_at timestamptz, person_id uuid, member_type text);
create table public.mta_registrations(id uuid primary key, email text, phone text);
create table public.mta_event_attendance(registration_id uuid, reversed boolean);
create table public.program_outreach_directory(import_key text primary key, display_name text, email text, phone_original text,
 programs jsonb default '[]', review_flags jsonb default '[]', provenance jsonb default '[]', email_permission text default 'unknown', imported_at timestamptz default now());

\ir ../../supabase/migrations/20261128060000_program_directory_review_evidence.sql

insert into auth.users values
 ('00000000-0000-0000-0000-0000000000a1','owner@example.test'),
 ('00000000-0000-0000-0000-0000000000a2','leader@example.test'),
 ('00000000-0000-0000-0000-0000000000a3','multi@example.test');
insert into public.profiles values ('00000000-0000-0000-0000-0000000000a1','owner'),('00000000-0000-0000-0000-0000000000a2','leader');
insert into public.program_outreach_directory(import_key,display_name,email,phone_original,programs,review_flags) values
 ('k-plain','Ada Plain','plain@example.test','+1 204 555 0101','["MTA"]','[]'),
 ('k-flag','Ben Flag','flag@example.test','+1 204 555 0102','["ILPC"]','["Likely domain typo; verify before use"]'),
 ('k-dupe1','Cy Dupe','dupe@example.test','+1 204 555 0103','["MTA"]','[]'),
 ('k-dupe2','Cy Dupe Two','dupe@example.test','+1 204 555 0199','["MTA"]','[]'),
 ('k-phone1','Di Phone','phone1@example.test','(204) 555-0104','["MTA"]','[]'),
 ('k-phone2','Ed Phone','phone2@example.test','204.555.0104','["ILPC"]','[]'),
 ('k-short','Fa Short','short@example.test','12345','["MTA"]','[]'),
 ('k-multi','Gu Multi','multi@example.test','+1 204 555 0105','["MTA","ILPC"]','[]'),
 ('k-member','Ha Member','member@example.test','+1 204 555 0106','["MTA"]','[]'),
 ('k-attend','Io Attend','attend@example.test','+1 204 555 0107','["MTA"]','[]');

create function pg_temp.as_user(p uuid) returns void language sql as $$ select set_config('request.jwt.claim.sub', coalesce(p::text,''), false) $$;
create function pg_temp.check(label text, ok boolean) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAIL: %', label; end if; raise notice 'PASS: %', label; end $$;

-- 1. Non-owner and anonymous callers are refused.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
do $$ begin perform public.program_directory_current(); raise exception 'FAIL: leader was allowed';
exception when insufficient_privilege then raise notice 'PASS: leader refused (42501)'; end $$;
select pg_temp.as_user(null);
do $$ begin perform public.program_directory_current(); raise exception 'FAIL: anonymous caller was allowed';
exception when insufficient_privilege then raise notice 'PASS: no session refused (42501)'; end $$;
select pg_temp.check('anon has no execute grant', not has_function_privilege('anon','public.program_directory_current()','execute'));
select pg_temp.check('authenticated has execute grant', has_function_privilege('authenticated','public.program_directory_current()','execute'));

-- 2. Baseline classification as the owner.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.check('plain contact unconfirmed, no evidence',
 (select relationship='unconfirmed' and not worker_match and not member_match and review_reasons='{}' from public.program_directory_current() where import_key='k-plain'));
select pg_temp.check('import flag -> review',
 (select relationship='review' and review_reasons=array['import_flag'] from public.program_directory_current() where import_key='k-flag'));
select pg_temp.check('shared email -> both rows review',
 (select count(*)=2 from public.program_directory_current() where email='dupe@example.test' and relationship='review' and 'shared_email'=any(review_reasons)));
select pg_temp.check('shared phone (punctuation differs) -> both rows review',
 (select count(*)=2 from public.program_directory_current() where import_key in ('k-phone1','k-phone2') and relationship='review' and review_reasons=array['shared_phone']));
select pg_temp.check('short phone is not treated as shared or matched',
 (select relationship='unconfirmed' and review_reasons='{}' from public.program_directory_current() where import_key='k-short'));

-- 3. Worker in several departments keeps every assignment.
insert into public.media_vault_staff values ('00000000-0000-0000-0000-0000000000a3');
insert into public.service_attendance_access values ('00000000-0000-0000-0000-0000000000a3', true);
insert into public.outreach_workers values ('00000000-0000-0000-0000-0000000000a3');
select pg_temp.check('worker keeps all departments',
 (select relationship='worker' and worker_match and worker_departments=array['attendance','evangelism','media'] from public.program_directory_current() where import_key='k-multi'));

-- 4. Member and worker shown independently.
insert into public.member_profile_intake values ('multi@example.test','+12045550105',now(),gen_random_uuid(),'member');
select pg_temp.check('worker and member flags both true',
 (select relationship='worker' and worker_match and member_match from public.program_directory_current() where import_key='k-multi'));

-- 5. Unreviewed profile does not confirm; reviewed matching profile does.
insert into public.member_profile_intake values ('member@example.test','+1 204 555 0106',null,null,'member');
select pg_temp.check('unreviewed profile not counted',
 (select relationship='unconfirmed' and not member_match from public.program_directory_current() where import_key='k-member'));
update public.member_profile_intake set reviewed_at=now(), person_id=gen_random_uuid() where email='member@example.test';
select pg_temp.check('reviewed matching profile -> member',
 (select relationship='member' and member_match from public.program_directory_current() where import_key='k-member'));

-- 6. Changed details: reviewed profile with same email but a different phone -> review, not silent.
update public.member_profile_intake set phone='+1 204 555 0177' where email='member@example.test';
select pg_temp.check('changed phone -> review with reason',
 (select relationship='review' and not member_match and review_reasons=array['member_details_differ'] from public.program_directory_current() where import_key='k-member'));
-- Correction restores the match.
update public.member_profile_intake set phone='+1 204 555 0106' where email='member@example.test';
select pg_temp.check('corrected phone -> member again',
 (select relationship='member' from public.program_directory_current() where import_key='k-member'));

-- 7. Attendance: check-in counts, reversal does not; review rows stay unknown.
insert into public.mta_registrations values ('00000000-0000-0000-0000-0000000000b1','attend@example.test','12045550107'),
 ('00000000-0000-0000-0000-0000000000b2','dupe@example.test','+1 204 555 0103');
insert into public.mta_event_attendance values ('00000000-0000-0000-0000-0000000000b1', true),('00000000-0000-0000-0000-0000000000b2', false);
select pg_temp.check('reversed check-in -> unknown',
 (select attendance='unknown' from public.program_directory_current() where import_key='k-attend'));
insert into public.mta_event_attendance values ('00000000-0000-0000-0000-0000000000b1', false);
select pg_temp.check('non-reversed check-in -> mta_attended',
 (select attendance='mta_attended' from public.program_directory_current() where import_key='k-attend'));
select pg_temp.check('review contact attendance stays unknown',
 (select attendance='unknown' from public.program_directory_current() where import_key='k-dupe1'));

-- 8. Totals are stable and every row is returned exactly once.
select pg_temp.check('one row per directory record',
 (select count(*)=10 and count(distinct import_key)=10 from public.program_directory_current()));
