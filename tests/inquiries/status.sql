-- Synthetic checks for inquiry status permissions. Fictional data only.
-- Run: PG_CONTAINER=<local postgres container> bash scripts/test-inquiry-status.sh
\set ON_ERROR_STOP on
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table public.profiles(id uuid primary key, role text);
create function public.staff_workspace() returns text language sql stable as $$ select nullif(current_setting('request.workspace',true),'') $$;
create function public.hbg_has_staff_role(allowed text[]) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.staff_workspace() = 'pastor', false)
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = any(allowed)) $$;
create table public.inquiries(
 id uuid primary key default gen_random_uuid(), created_at timestamptz default now(),
 full_name text not null, email text not null, type text not null, message text, status text default 'pending',
 phone text, category text, confidential boolean default false, area text, visit_type text, invited_by text, prayer_need text);
alter table public.inquiries enable row level security;
create policy "Public insert access for inquiries" on public.inquiries for insert to anon, authenticated with check (true);
create policy "Staff read inquiries" on public.inquiries for select to authenticated
 using (public.hbg_has_staff_role(array['owner','pastor','manager']));
-- Starting grants match the hosted project.
grant usage on schema public, auth to anon, authenticated;
grant all on public.inquiries to anon, authenticated;
grant execute on function auth.uid(), public.staff_workspace(), public.hbg_has_staff_role(text[]) to anon, authenticated;

insert into public.profiles values
 ('00000000-0000-4000-8000-000000000001','owner'),('00000000-0000-4000-8000-000000000002','manager'),
 ('00000000-0000-4000-8000-000000000003','leader');
insert into public.inquiries(id,full_name,email,type,status) values
 ('00000000-0000-4000-8000-000000000101','Example One','one@example.test','Prayer Request','pending'),
 ('00000000-0000-4000-8000-000000000102','Example Two','two@example.test','ilpc_2026_registration','new');

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
-- Number of rows an update reaches.
create function public.t_update(n int, new_status text) returns int language plpgsql as $$
declare changed int;
begin
 update public.inquiries set status=new_status where id=('00000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid;
 get diagnostics changed = row_count; return changed;
end $$;
create function public.t_as(who int, workspace text) returns void language sql as $$
 select set_config('request.jwt.claim.sub', coalesce('00000000-0000-4000-8000-' || lpad(who::text,12,'0'),''), false),
  set_config('request.workspace', coalesce(workspace,''), false) $$;
grant execute on function public.t_check(text,boolean), public.t_fails(text,text,text), public.t_update(int,text), public.t_as(int,text) to anon, authenticated;

set role authenticated;
select public.t_as(1,'pastor');
select public.t_check('bug reproduced: owner update reaches no row before the migration', public.t_update(101,'reviewed')=0);
reset role;

\ir ../../supabase/migrations/20261128060000_inquiry_status_update.sql

set role authenticated;
select public.t_as(1,'pastor');
select public.t_check('owner saves a status', public.t_update(101,'reviewed')=1);
select public.t_check('saved status is stored', (select status='reviewed' from public.inquiries where id='00000000-0000-4000-8000-000000000101'));
select public.t_check('owner moves an unlisted starting status', public.t_update(102,'contacted')=1);
select public.t_fails('unknown status refused','42501', $q$ select public.t_update(101,'archived') $q$);
select public.t_fails('empty status refused','42501', $q$ select public.t_update(101,null) $q$);
select public.t_fails('other columns cannot be edited','42501', $q$ update public.inquiries set message='changed' $q$);
select public.t_fails('delete denied','42501', $q$ delete from public.inquiries $q$);
select public.t_fails('truncate denied','42501', $q$ truncate public.inquiries $q$);
select public.t_as(2,'pastor');
select public.t_check('manager in the pastor workspace saves', public.t_update(101,'contacted')=1);
select public.t_as(2,'attendance');
select public.t_check('manager outside the pastor workspace cannot save', public.t_update(101,'pending')=0);
select public.t_as(3,'pastor');
select public.t_check('leader cannot save', public.t_update(101,'pending')=0);
select public.t_check('leader reads nothing', (select count(*)=0 from public.inquiries));
select public.t_as(null,null);
select public.t_check('signed-in account without a profile cannot save', public.t_update(101,'pending')=0);
insert into public.inquiries(full_name,email,type,message) values('Signed In','signed@example.test','General Inquiry','Hello');
reset role;

set role anon;
-- Website forms and the conference app keep inserting as before.
insert into public.inquiries(full_name,email,type,message,phone,category,confidential,area,visit_type,invited_by,prayer_need)
 values('Public Form','public@example.test','Prayer Request','Hello',null,'General',true,null,null,null,null);
insert into public.inquiries(full_name,email,type,status,message) values('Conference','conf@example.test','ilpc_2026_registration','new','{}');
select public.t_fails('anon cannot read','42501', $q$ select * from public.inquiries $q$);
select public.t_fails('anon cannot update','42501', $q$ select public.t_update(101,'pending') $q$);
select public.t_fails('anon cannot delete','42501', $q$ delete from public.inquiries $q$);
select public.t_fails('anon cannot truncate','42501', $q$ truncate public.inquiries $q$);
reset role;
select public.t_check('all three public inserts stored', (select count(*)=5 from public.inquiries));
select public.t_check('refused changes left data alone', (select status='contacted' and message is null from public.inquiries where id='00000000-0000-4000-8000-000000000101'));
