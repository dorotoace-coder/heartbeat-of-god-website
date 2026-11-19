begin;

create or replace function public.treasury_confirm_income(p_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  entry public.treasury_income;
begin
  select i.* into entry
  from public.treasury_income i
  where i.id = p_id
    and public.treasury_has_role(i.church_id, array['admin','treasurer','approver']::public.treasury_role[])
  for update;

  if not found then
    raise exception 'Collection unavailable.' using errcode = '42501';
  end if;
  if entry.entered_by is null or entry.entered_by = actor then
    raise exception 'A different authorized person must confirm this collection.' using errcode = '42501';
  end if;
  if entry.confirmed_by = actor then return; end if;
  if entry.confirmed_at is not null then
    raise exception 'Collection already confirmed.';
  end if;

  perform set_config('treasury.allow_update', 'on', true);
  update public.treasury_income
    set confirmed_by = actor, confirmed_at = now()
    where id = p_id;
  perform set_config('treasury.allow_update', 'off', true);
end;
$$;

revoke execute on function public.treasury_confirm_income(uuid) from public, anon;
grant execute on function public.treasury_confirm_income(uuid) to authenticated;

commit;
