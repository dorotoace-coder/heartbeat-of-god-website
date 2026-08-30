-- Complete the local HBOG authorization contract without granting privileged
-- browser access. Public content remains readable, staff writes are bounded by
-- the role stored in public.profiles, and donation completion stays reserved
-- for a future trusted server-side payment verifier.

begin;

update public.sermons set category = 'General' where category is null;
alter table public.sermons alter column category set not null;

update public.events
set location = 'Online / Main Sanctuary'
where location is null;
update public.events set is_highlighted = false where is_highlighted is null;
update public.events set recurrence = 'one-time' where recurrence is null;
alter table public.events alter column location set not null;
alter table public.events alter column is_highlighted set not null;
alter table public.events alter column recurrence set not null;

update public.pulse set is_live = false where is_live is null;
alter table public.pulse alter column is_live set not null;

alter table public.donations alter column status set default 'pending';

drop policy if exists donations_public_insert on public.donations;
create policy donations_public_insert
  on public.donations for insert to anon, authenticated
  with check (
    btrim(currency) <> ''
    and amount > 0
    and btrim(frequency) <> ''
    and btrim(payment_method) <> ''
    and status = 'pending'
  );

grant insert, update, delete on table public.events to authenticated;

drop policy if exists events_manager_insert on public.events;
drop policy if exists events_manager_update on public.events;
drop policy if exists events_manager_delete on public.events;

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

grant insert, update, delete on table public.sermons to authenticated;

drop policy if exists sermons_manager_insert on public.sermons;
drop policy if exists sermons_manager_update on public.sermons;
drop policy if exists sermons_pastor_delete on public.sermons;

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

commit;
