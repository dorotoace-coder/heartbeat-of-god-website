create schema if not exists auth;
create table if not exists auth.users(id uuid primary key);
do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls;end if;end $$;
create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated,anon,service_role;
grant execute on function auth.uid() to authenticated,anon,service_role;
create function public.staff_workspace() returns text language sql stable as $$select current_setting('test.workspace',true)$$;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003'),('00000000-0000-4000-8000-000000000004');

create table public.treasury_portal_access(user_id uuid primary key,office text);
insert into public.treasury_portal_access values('00000000-0000-4000-8000-000000000003','pastor'),('00000000-0000-4000-8000-000000000004','treasury_leader');
