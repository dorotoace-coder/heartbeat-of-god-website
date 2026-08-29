-- Converge protected HBOG tables to one exact authorization manifest.
-- This intentionally removes every pre-existing policy on these tables before
-- recreating the reviewed set, so permissive policy drift cannot survive.

begin;

revoke all on schema public from public, anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

do $policy_cleanup$
declare
  existing_policy record;
  protected_table record;
  protected_columns text;
begin
  for existing_policy in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in (
         'sermons', 'events', 'pulse', 'donations',
         'departments', 'profiles', 'inquiries'
       )
  loop
    execute format(
      'drop policy %I on %I.%I',
      existing_policy.policyname,
      existing_policy.schemaname,
      existing_policy.tablename
    );
  end loop;

  for protected_table in
    select unnest(array[
      'sermons', 'events', 'pulse', 'donations',
      'departments', 'profiles', 'inquiries'
    ]) as tablename
  loop
    select string_agg(format('%I', column_name), ', ' order by ordinal_position)
      into protected_columns
      from information_schema.columns
     where table_schema = 'public'
       and table_name = protected_table.tablename;

    execute format(
      'revoke all privileges (%s) on table public.%I from public, anon, authenticated, service_role',
      protected_columns,
      protected_table.tablename
    );
  end loop;
end
$policy_cleanup$;

alter table public.sermons enable row level security;
alter table public.events enable row level security;
alter table public.pulse enable row level security;
alter table public.donations enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.inquiries enable row level security;

revoke all privileges on table public.sermons from public, anon, authenticated, service_role;
revoke all privileges on table public.events from public, anon, authenticated, service_role;
revoke all privileges on table public.pulse from public, anon, authenticated, service_role;
revoke all privileges on table public.donations from public, anon, authenticated, service_role;
revoke all privileges on table public.departments from public, anon, authenticated, service_role;
revoke all privileges on table public.profiles from public, anon, authenticated, service_role;
revoke all privileges on table public.inquiries from public, anon, authenticated, service_role;

grant select on table public.sermons to anon, authenticated;
grant insert, update, delete on table public.sermons to authenticated;
grant select, insert, update, delete on table public.sermons to service_role;

grant select on table public.events to anon, authenticated;
grant insert, update, delete on table public.events to authenticated;
grant select, insert, update, delete on table public.events to service_role;

grant select on table public.pulse to anon, authenticated;
grant select, insert, update, delete on table public.pulse to service_role;

grant insert (
  currency, amount, frequency, payment_method, status,
  reference, donor_email, donor_name
) on table public.donations to anon, authenticated;
grant select, insert, update, delete on table public.donations to service_role;

grant select on table public.departments to anon, authenticated;
grant select, insert, update, delete on table public.departments to service_role;

grant select (id, full_name, role, department_id, updated_at)
  on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profiles to service_role;

grant insert (
  full_name, email, type, message, phone, category, confidential,
  area, visit_type, invited_by, prayer_need
) on table public.inquiries to anon, authenticated;
grant select on table public.inquiries to authenticated;
grant update (status) on table public.inquiries to authenticated;
grant select, insert, update, delete on table public.inquiries to service_role;

create policy sermons_public_select
  on public.sermons for select to anon, authenticated
  using (true);

create policy sermons_manager_insert
  on public.sermons for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  );

create policy sermons_manager_update
  on public.sermons for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  );

create policy sermons_pastor_delete
  on public.sermons for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor')
    )
  );

create policy events_public_select
  on public.events for select to anon, authenticated
  using (true);

create policy events_manager_insert
  on public.events for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  );

create policy events_manager_update
  on public.events for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  );

create policy events_manager_delete
  on public.events for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  );

create policy pulse_public_select
  on public.pulse for select to anon, authenticated
  using (true);

create policy donations_public_insert
  on public.donations for insert to anon, authenticated
  with check (
    btrim(currency) <> ''
    and amount > 0
    and btrim(frequency) <> ''
    and btrim(payment_method) <> ''
    and status = 'pending'
  );

create policy departments_public_select
  on public.departments for select to anon, authenticated
  using (true);

create policy profiles_authenticated_select_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy inquiries_public_insert
  on public.inquiries for insert to anon, authenticated
  with check (
    btrim(full_name) <> ''
    and btrim(email) <> ''
    and btrim(type) <> ''
    and status = 'pending'
  );

create policy inquiries_manager_select
  on public.inquiries for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  );

create policy inquiries_manager_update_status
  on public.inquiries for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  )
  with check (
    status in ('pending', 'reviewed', 'contacted')
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  );

commit;
