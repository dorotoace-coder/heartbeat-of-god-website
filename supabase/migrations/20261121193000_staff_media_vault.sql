begin;

-- Access is assigned by administrators against existing sign-in accounts.
create table public.media_vault_staff (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.media_vault_staff enable row level security;
revoke all on public.media_vault_staff from public, anon, authenticated;
grant select on public.media_vault_staff to authenticated;
create policy media_vault_staff_self on public.media_vault_staff
  for select to authenticated using (user_id = (select auth.uid()));

-- Multiple department assignments need administrator review. Never select a
-- department by precedence when more than one assignment exists.
create function public.staff_workspace() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.treasury_portal_access where user_id = auth.uid() and office = 'pastor') then 'pastor'
    when count(*) = 1 then min(department)
  end
  from (
    select 'media'::text as department from public.media_vault_staff where user_id = auth.uid()
    union all
    select 'attendance' from public.service_attendance_access where user_id = auth.uid() and can_submit
    union all
    select 'treasury' from public.treasury_portal_access where user_id = auth.uid() and office = 'treasury_leader'
  ) departments;
$$;
revoke all on function public.staff_workspace() from public, anon;
grant execute on function public.staff_workspace() to authenticated;

create function public.can_use_media_vault() returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce(public.staff_workspace() in ('media', 'pastor'), false);
$$;
revoke all on function public.can_use_media_vault() from public, anon;
grant execute on function public.can_use_media_vault() to authenticated;

insert into storage.buckets (id, name, public)
values ('staff-media-vault', 'staff-media-vault', false);

create policy staff_media_read on storage.objects for select to authenticated
  using (bucket_id = 'staff-media-vault' and (select public.can_use_media_vault()));
create policy staff_media_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'staff-media-vault' and (select public.can_use_media_vault()));

commit;
