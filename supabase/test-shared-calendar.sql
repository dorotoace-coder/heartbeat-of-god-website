\set ON_ERROR_STOP on
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
create type public.treasury_role as enum ('admin', 'treasurer', 'approver', 'viewer');
create table public.treasury_members (
  church_id uuid, user_id uuid, role public.treasury_role, active boolean
);
create table public.treasury_income (
  church_id uuid, entry_date date not null, service text
);
alter table public.treasury_income enable row level security;
grant select, insert on public.treasury_income to authenticated;
create function public.treasury_has_role(p_church uuid, p_roles public.treasury_role[])
returns boolean language sql as $$ select false $$;
create function public.treasury_has_role_text(p_church text, p_roles public.treasury_role[])
returns boolean language sql as $$ select false $$;
create policy fixture_income on public.treasury_income to authenticated
  using (public.treasury_has_role(church_id, array['admin']::public.treasury_role[]));
create view public.treasury_monthly_summary as select count(*) as entries from public.treasury_income;
