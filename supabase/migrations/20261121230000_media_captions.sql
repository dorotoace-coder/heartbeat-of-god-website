begin;

create table public.media_captions (
  asset_path text primary key,
  caption text not null check (length(trim(caption)) between 1 and 1200),
  updated_by uuid not null default auth.uid() references auth.users,
  updated_at timestamptz not null default now(),
  approved_by uuid references auth.users,
  approved_at timestamptz,
  check ((approved_by is null) = (approved_at is null))
);
alter table public.media_captions enable row level security;
revoke all on public.media_captions from public,anon,authenticated;
grant select,insert(asset_path,caption),update(caption) on public.media_captions to authenticated;
create policy media_caption_read on public.media_captions for select to authenticated
  using ((select public.can_use_media_vault()));
create policy media_caption_insert on public.media_captions for insert to authenticated
  with check ((select public.can_use_media_vault()) and updated_by=(select auth.uid()) and
    exists (select 1 from storage.objects o where o.bucket_id='staff-media-vault' and o.name=asset_path));
create policy media_caption_update on public.media_captions for update to authenticated
  using ((select public.can_use_media_vault())) with check ((select public.can_use_media_vault()));

create function public.reset_media_caption_approval() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.caption is distinct from old.caption then
    new.updated_by=auth.uid();
    new.updated_at=now();
    new.approved_by=null;
    new.approved_at=null;
  end if;
  return new;
end $$;
create trigger media_caption_changed before update on public.media_captions
  for each row execute function public.reset_media_caption_approval();

create function public.approve_media_caption(p_path text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if public.staff_workspace() is distinct from 'pastor' then
    raise exception 'Pastor approval required' using errcode='42501';
  end if;
  update public.media_captions set approved_by=auth.uid(),approved_at=now()
  where asset_path=p_path and length(trim(caption))>0;
  if not found then raise exception 'Caption unavailable'; end if;
end $$;
revoke all on function public.approve_media_caption(text) from public,anon;
grant execute on function public.approve_media_caption(text) to authenticated;

create table public.media_caption_requests (
  user_id uuid not null references auth.users,
  requested_at timestamptz not null default now()
);
create index media_caption_requests_daily on public.media_caption_requests(user_id,requested_at);
alter table public.media_caption_requests enable row level security;
revoke all on public.media_caption_requests from public,anon,authenticated;
create function public.reserve_media_caption_request() returns boolean
language plpgsql security definer set search_path='' as $$
declare today_count integer;
begin
  if not coalesce(public.can_use_media_vault(),false) then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(auth.uid()::text));
  select count(*) into today_count from public.media_caption_requests
    where user_id=auth.uid() and requested_at >= date_trunc('day',now());
  if today_count >= 20 then return false; end if;
  insert into public.media_caption_requests(user_id) values(auth.uid());
  return true;
end $$;
revoke all on function public.reserve_media_caption_request() from public,anon;
grant execute on function public.reserve_media_caption_request() to authenticated;

commit;
