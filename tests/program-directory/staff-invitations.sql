-- Synthetic checks for staff invitations. Fictional people only.
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
-- Shapes copied from the hosted project.
create table public.outreach_workers(user_id uuid primary key references auth.users(id), full_name text not null);
create table public.media_vault_staff(user_id uuid primary key references auth.users(id) on delete cascade);
create table public.service_attendance_access(user_id uuid primary key references auth.users(id) on delete cascade,
 can_submit boolean not null default false, can_schedule boolean not null default false, can_correct boolean not null default false);
create table public.foundation_teachers(id uuid primary key references auth.users(id), full_name text not null check (length(trim(full_name)) > 0), trained_on date not null);
create table public.treasury_portal_access(church_id uuid not null, office text not null check (office in ('pastor','treasury_leader')),
 user_id uuid not null references auth.users(id) on delete cascade, primary key (church_id, office), unique (church_id, user_id));
create table public.pastorate_assignments(user_id uuid primary key references auth.users(id), display_name text not null, responsibility text not null,
 assignment text not null, review_on date not null, active boolean not null default true, approved_by uuid not null default auth.uid() references auth.users(id));
grant usage on schema auth, public to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
grant select on public.profiles, public.congregation_people to authenticated;

\ir ../../supabase/migrations/20261128045844_person_source_links.sql
\ir ../../supabase/migrations/20261128061818_staff_invitations.sql

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
-- Tokens are kept between steps the way an email would carry them.
create table public.t_tokens(name text primary key, token text);
create function public.t_invite(name text, n int, email text, role text, details jsonb default '{}') returns void language sql as $$
 insert into public.t_tokens values (name, public.staff_invite_create(public.t_id(n), email, initcap(split_part(email,'@',1)), role, details))
 on conflict (name) do update set token=excluded.token $$;
create function public.t_token(name text) returns text language sql as $$ select token from public.t_tokens where t_tokens.name=$1 $$;
grant all on public.t_tokens to authenticated, anon;
grant execute on function public.t_check(text,boolean), public.t_fails(text,text,text), public.t_id(int), public.t_as(int),
 public.t_invite(text,int,text,text,jsonb), public.t_token(text) to authenticated, anon;

insert into auth.users values
 (public.t_id(1),'owner@example.test'),(public.t_id(2),'leader@example.test'),
 (public.t_id(11),'ada@example.test'),(public.t_id(12),'ben@example.test'),(public.t_id(13),'cy@example.test'),
 (public.t_id(14),'di@example.test'),(public.t_id(15),'ed@example.test'),(public.t_id(16),'busy@example.test'),
 (public.t_id(17),'fay@example.test');
insert into public.profiles values (public.t_id(1),'owner'),(public.t_id(2),'leader');
insert into public.media_vault_staff values (public.t_id(16));

select public.t_check('anon cannot run invitation functions', not has_function_privilege('anon','public.staff_invite_accept(text)','execute')
 and not has_function_privilege('anon','public.staff_invite_create(uuid,text,text,text,jsonb)','execute'));
select public.t_check('token hashes are not readable', not has_column_privilege('authenticated','public.staff_invitations','token_hash','select'));
select public.t_check('helpers are not callable directly', not has_function_privilege('authenticated','public.staff_has_department(uuid)','execute')
 and not has_function_privilege('authenticated','public.staff_invite_token_hash(text)','execute'));
select public.t_check('no client writes', not has_table_privilege('authenticated','public.staff_invitations','insert')
 and not has_table_privilege('authenticated','public.staff_invitations','update'));

set role authenticated;
select public.t_as(2);
select public.t_fails('leader cannot invite','42501', $q$ select public.t_invite('x',100,'ada@example.test','media') $q$);

select public.t_as(1);
select public.t_fails('unknown role refused (no Treasury or admin)','HB036', $q$ select public.t_invite('x',100,'ada@example.test','treasury') $q$);
select public.t_fails('owner role refused','HB036', $q$ select public.t_invite('x',100,'ada@example.test','owner') $q$);
select public.t_fails('bad email refused','HB036', $q$ select public.t_invite('x',100,'not-an-email','media') $q$);
select public.t_fails('teacher needs a training date','HB036', $q$ select public.t_invite('x',100,'ada@example.test','foundation_teacher') $q$);
select public.t_fails('pastorate needs its details','HB036', $q$ select public.t_invite('x',100,'ada@example.test','pastorate','{"responsibility":"Field Pastor"}') $q$);
select public.t_fails('someone already in a department refused','HB031', $q$ select public.t_invite('x',100,'busy@example.test','attendance') $q$);
select public.t_check('refusals created nothing', (select count(*)=0 from public.staff_invitations));

-- Create: token returned once, stored only as a hash.
select public.t_invite('ada', 101, 'Ada@Example.TEST', 'outreach_worker');
select public.t_check('token is long and random', (select length(public.t_token('ada'))=64));
select public.t_fails('same invitation id refused','HB032', $q$ select public.t_invite('ada2',101,'ada@example.test','outreach_worker') $q$);
select public.t_fails('second open invitation for the same person and role refused','HB037', $q$ select public.t_invite('ada2',102,'ada@example.test','outreach_worker') $q$);
select public.staff_invite_mark_sent(public.t_id(101), true, null);
select public.t_check('owner sees the invitation as sent', (select sent_at is not null and email='ada@example.test' from public.staff_invitations where id=public.t_id(101)));

-- Preview and acceptance are tied to the invited email.
select public.t_as(12);
select public.t_fails('unknown link refused','HB033', $q$ select * from public.staff_invite_preview('nope') $q$);
select public.t_check('another account sees the offer but not a match', (select status='open' and not email_matches and role='outreach_worker' from public.staff_invite_preview(public.t_token('ada'))));
select public.t_fails('another account cannot accept','HB034', $q$ select public.staff_invite_accept(public.t_token('ada')) $q$);
select public.t_as(11);
select public.t_check('invited account sees a match', (select email_matches from public.staff_invite_preview(public.t_token('ada'))));
select public.t_check('accept grants exactly that role', public.staff_invite_accept(public.t_token('ada'))='outreach_worker');
select public.t_check('accepting again is harmless', public.staff_invite_accept(public.t_token('ada'))='outreach_worker');
select public.t_as(12);
select public.t_fails('a used link cannot be reused by someone else','HB039', $q$ select public.staff_invite_accept(public.t_token('ada')) $q$);
reset role;
select public.t_check('outreach worker added once with the invited name', (select count(*)=1 and min(full_name)='Ada' from public.outreach_workers where user_id=public.t_id(11)));
select public.t_check('nothing granted to the wrong account', (select count(*)=0 from public.outreach_workers where user_id=public.t_id(12)));
set role authenticated;

-- One department per person: checked when inviting and again when accepting.
select public.t_as(1);
select public.t_fails('second department refused when inviting','HB031', $q$ select public.t_invite('ada-media',103,'ada@example.test','media') $q$);
select public.t_invite('fay', 103, 'fay@example.test', 'media');
reset role;
insert into public.outreach_workers values (public.t_id(17), 'Fay');
set role authenticated;
select public.t_as(17);
select public.t_fails('department gained after the invitation is refused at acceptance','HB031', $q$ select public.staff_invite_accept(public.t_token('fay')) $q$);

-- Resend replaces the link; revoke stops it; expiry stops it.
select public.t_as(1);
select public.t_invite('ben', 104, 'ben@example.test', 'media');
insert into public.t_tokens values ('ben-new', public.staff_invite_reissue(public.t_id(104))) on conflict (name) do update set token=excluded.token;
select public.t_as(12);
select public.t_fails('old link stops working after resend','HB033', $q$ select public.staff_invite_accept(public.t_token('ben')) $q$);
select public.t_check('new link works', public.staff_invite_accept(public.t_token('ben-new'))='media');
select public.t_as(1);
select public.t_invite('cy', 105, 'cy@example.test', 'attendance');
select public.staff_invite_revoke(public.t_id(105));
select public.t_as(13);
select public.t_check('revoked invitation shows as revoked', (select status='revoked' from public.staff_invite_preview(public.t_token('cy'))));
select public.t_fails('revoked invitation cannot be accepted','HB039', $q$ select public.staff_invite_accept(public.t_token('cy')) $q$);
select public.t_as(1);
select public.t_fails('revoked invitation cannot be resent','HB038', $q$ select public.staff_invite_reissue(public.t_id(105)) $q$);
select public.t_invite('cy2', 106, 'cy@example.test', 'attendance');
reset role;
update public.staff_invitations set expires_at=now() - interval '1 minute' where id=public.t_id(106);
set role authenticated;
select public.t_as(13);
select public.t_fails('expired invitation cannot be accepted','HB039', $q$ select public.staff_invite_accept(public.t_token('cy2')) $q$);

-- Each role grants its own access.
select public.t_as(1);
select public.t_invite('di', 107, 'di@example.test', 'foundation_teacher', '{"trained_on":"2026-11-01"}');
select public.t_invite('ed', 108, 'ed@example.test', 'attendance');
select public.t_invite('busy-pastor', 109, 'busy@example.test', 'pastorate', '{"responsibility":"Field Pastor","assignment":"Lead the Sunday prayer team only.","review_on":"2027-02-01"}');
select public.t_as(14); select public.staff_invite_accept(public.t_token('di'));
select public.t_as(15); select public.staff_invite_accept(public.t_token('ed'));
select public.t_as(16); select public.staff_invite_accept(public.t_token('busy-pastor'));
reset role;
select public.t_check('teacher added with the training date', (select trained_on='2026-11-01' from public.foundation_teachers where id=public.t_id(14)));
select public.t_check('attendance can submit only', (select can_submit and not can_schedule and not can_correct from public.service_attendance_access where user_id=public.t_id(15)));
select public.t_check('media access added', (select count(*)=1 from public.media_vault_staff where user_id=public.t_id(12)));
select public.t_check('pastorate allowed alongside a department, approved by the inviter', (select active and approved_by=public.t_id(1) and responsibility='Field Pastor'
 from public.pastorate_assignments where user_id=public.t_id(16)));
select public.t_check('no Treasury access granted by any invitation', (select count(*)=0 from public.treasury_portal_access));
set role authenticated;
select public.t_as(1);
select public.t_fails('second active pastorate refused','HB031', $q$ select public.t_invite('busy-pastor-2',110,'busy@example.test','pastorate','{"responsibility":"Field Pastor","assignment":"Another task here.","review_on":"2027-03-01"}') $q$);

-- Owner sees the list; leaders do not.
select public.t_check('owner lists invitations', (select count(*)=8 from public.staff_invitations));
select public.t_as(2);
select public.t_check('leader lists nothing', (select count(*)=0 from public.staff_invitations));

-- Daily limit.
select public.t_as(1);
do $$ begin for n in 1..12 loop perform public.staff_invite_create(public.t_id(300+n), 'limit'||n||'@example.test', 'Limit', 'media', '{}'); end loop; end $$;
select public.t_fails('daily limit of 20','HB035', $q$ select public.t_invite('over',399,'over@example.test','media') $q$);
reset role;
