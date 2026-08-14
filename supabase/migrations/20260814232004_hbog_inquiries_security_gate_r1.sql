-- ============================================================
-- DOR-AIOS-HBOG-INQUIRIES-SECURITY-GATE-R1
--
-- Protect inquiry contents while preserving:
--   * anonymous/authenticated public form submissions; and
--   * owner/pastor/manager inbox reads and status-only updates.
--
-- Profile role assignment is server/service-role managed. This prevents an
-- authenticated user from promoting their own profile to bypass inquiry RLS.
-- Apply and verify on staging before any production migration.
-- ============================================================

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone."
  on public.profiles;
drop policy if exists "Users can update their own profiles."
  on public.profiles;
drop policy if exists profiles_authenticated_select_own
  on public.profiles;

revoke all privileges on table public.profiles from anon, authenticated;
grant select (
  id,
  full_name,
  role,
  department_id,
  updated_at
) on table public.profiles to authenticated;

create policy profiles_authenticated_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

alter table public.inquiries enable row level security;

drop policy if exists "Public insert access for inquiries"
  on public.inquiries;
drop policy if exists "Authenticated read access for inquiries"
  on public.inquiries;
drop policy if exists inquiries_public_insert
  on public.inquiries;
drop policy if exists inquiries_manager_select
  on public.inquiries;
drop policy if exists inquiries_manager_update_status
  on public.inquiries;

revoke all privileges on table public.inquiries from anon, authenticated;

grant insert (
  full_name,
  email,
  type,
  message,
  phone,
  category,
  confidential,
  area,
  visit_type,
  invited_by,
  prayer_need
) on table public.inquiries to anon, authenticated;
grant select on table public.inquiries to authenticated;
grant update (status) on table public.inquiries to authenticated;

create policy inquiries_public_insert
  on public.inquiries
  for insert
  to anon, authenticated
  with check (
    btrim(full_name) <> ''
    and btrim(email) <> ''
    and btrim(type) <> ''
    and status = 'pending'
  );

create policy inquiries_manager_select
  on public.inquiries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  );

create policy inquiries_manager_update_status
  on public.inquiries
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  )
  with check (
    status in ('pending', 'reviewed', 'contacted')
    and exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'pastor', 'manager')
    )
  );
