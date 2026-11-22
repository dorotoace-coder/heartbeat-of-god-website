begin;

create table public.media_asset_reviews (
  asset_path text primary key,
  storage_provider text not null default 'supabase' check (storage_provider in ('supabase')),
  title text not null check (length(trim(title)) between 1 and 160),
  purpose text not null check (purpose in ('website', 'youtube', 'archive')),
  note text check (note is null or length(note) <= 1000),
  status text not null default 'in_review' check (status in ('in_review', 'approved', 'archived')),
  submitted_by uuid not null references auth.users,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users,
  reviewed_at timestamptz,
  check ((reviewed_by is null) = (reviewed_at is null))
);
alter table public.media_asset_reviews enable row level security;
revoke all on public.media_asset_reviews from public, anon, authenticated;
grant select on public.media_asset_reviews to authenticated;
create policy media_reviews_staff_read on public.media_asset_reviews
  for select to authenticated using ((select public.can_use_media_vault()));

create function public.submit_media_asset(p_path text, p_title text, p_purpose text, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(public.can_use_media_vault(), false) then
    raise exception 'Media access required' using errcode = '42501';
  end if;
  if p_path is null or length(p_path) > 200 or
     p_path !~ '^[0-9a-f-]{36}_[^/\\]+$' or
     not exists (select 1 from storage.objects where bucket_id = 'staff-media-vault' and name = p_path) then
    raise exception 'Choose a file in the private vault';
  end if;
  if length(trim(coalesce(p_title, ''))) not between 1 and 160 or
     p_purpose not in ('website', 'youtube', 'archive') or
     length(coalesce(p_note, '')) > 1000 then
    raise exception 'Check the title, purpose and note';
  end if;
  insert into public.media_asset_reviews(asset_path, title, purpose, note, submitted_by)
  values (p_path, trim(p_title), p_purpose, nullif(trim(p_note), ''), auth.uid())
  on conflict (asset_path) do update set
    title = excluded.title, purpose = excluded.purpose, note = excluded.note,
    submitted_by = auth.uid(), submitted_at = now()
  where media_asset_reviews.status = 'in_review';
  if not found then raise exception 'The review is already closed'; end if;
end $$;
revoke all on function public.submit_media_asset(text,text,text,text) from public, anon;
grant execute on function public.submit_media_asset(text,text,text,text) to authenticated;

create function public.review_media_asset(p_path text, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.staff_workspace() is distinct from 'pastor' then
    raise exception 'Pastor review required' using errcode = '42501';
  end if;
  if p_action = 'approve' and not exists (
    select 1 from public.media_captions
    where asset_path = p_path and approved_at is not null
  ) then raise exception 'Approve the saved caption first'; end if;
  if p_action not in ('approve', 'archive', 'reopen') then raise exception 'Unknown review action'; end if;
  if p_action = 'approve' and exists (
    select 1 from public.media_asset_reviews where asset_path = p_path and purpose = 'archive'
  ) then raise exception 'Archive-only items cannot be approved for publication'; end if;
  update public.media_asset_reviews set
    status = case p_action when 'approve' then 'approved' when 'archive' then 'archived' else 'in_review' end,
    reviewed_by = case when p_action = 'reopen' then null else auth.uid() end,
    reviewed_at = case when p_action = 'reopen' then null else now() end
  where asset_path = p_path and
    ((p_action = 'reopen' and status in ('approved', 'archived')) or
     (p_action in ('approve', 'archive') and status = 'in_review'));
  if not found then raise exception 'Media item is not in the expected review state'; end if;
end $$;
revoke all on function public.review_media_asset(text,text) from public, anon;
grant execute on function public.review_media_asset(text,text) to authenticated;

create function public.reopen_media_review_after_caption_edit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.caption is distinct from old.caption then
    update public.media_asset_reviews set status = 'in_review', reviewed_by = null, reviewed_at = null
    where asset_path = new.asset_path and status = 'approved';
  end if;
  return new;
end $$;
create trigger media_review_caption_changed after update on public.media_captions
  for each row execute function public.reopen_media_review_after_caption_edit();
revoke all on function public.reopen_media_review_after_caption_edit() from public, anon, authenticated;

commit;
