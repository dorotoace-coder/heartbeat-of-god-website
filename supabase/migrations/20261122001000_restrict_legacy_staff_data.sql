begin;

-- Pulse OS staff accounts share this database with the older MTA application.
-- Public registration remains open; only the Pastor may read registrations.
drop policy if exists "MTA registrations admin read" on public.mta_registrations;
create policy "MTA registrations pastor read" on public.mta_registrations
  for select to authenticated
  using (public.staff_workspace() = 'pastor');

-- The MTA sender uses a service-role key, so ordinary staff have no reason
-- to read or forge its delivery audit records.
drop policy if exists mta_devotional_send_audit_authenticated_select on public.mta_devotional_send_audit;
drop policy if exists mta_devotional_send_audit_authenticated_insert on public.mta_devotional_send_audit;
create policy mta_devotional_send_audit_pastor_select on public.mta_devotional_send_audit
  for select to authenticated
  using (public.staff_workspace() = 'pastor');
create policy mta_devotional_send_audit_pastor_insert on public.mta_devotional_send_audit
  for insert to authenticated
  with check (public.staff_workspace() = 'pastor');

-- Staff profiles include department assignments. Workers need their own
-- profile; the Pastor may see the directory for oversight.
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Staff profiles own or pastor read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.staff_workspace() = 'pastor');

-- The legacy editorial role helper must not grant operational access to a
-- future worker merely because their profile carries a legacy manager role.
create or replace function public.hbg_has_staff_role(allowed text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.staff_workspace() = 'pastor', false)
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = any(allowed)
    );
$$;

commit;
