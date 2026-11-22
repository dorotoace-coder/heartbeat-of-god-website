begin;

-- Raw videos over the storage plan's file limit stay in a shared Google Drive
-- folder. The vault records a link to the file and sends it through the same
-- caption and Pastor review steps as uploaded files.
alter table public.media_asset_reviews
  drop constraint media_asset_reviews_storage_provider_check;
alter table public.media_asset_reviews
  add column external_url text,
  add constraint media_asset_reviews_storage_provider_check
    check (storage_provider in ('supabase', 'google_drive')),
  add constraint media_asset_reviews_external_link check (
    (storage_provider = 'google_drive') = (external_url is not null) and
    (storage_provider <> 'google_drive' or (
      asset_path ~ '^drive/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and
      external_url ~ '^https://drive\.google\.com/file/d/[A-Za-z0-9_-]{10,200}/view$'
    ))
  );
create unique index media_asset_reviews_external_url
  on public.media_asset_reviews(external_url) where external_url is not null;

create function public.submit_media_link(
  p_path text, p_url text, p_title text, p_purpose text, p_note text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  file_id text;
  link text;
begin
  if not coalesce(public.can_use_media_vault(), false) then
    raise exception 'Media access required' using errcode = '42501';
  end if;
  if p_path is null or
     p_path !~ '^drive/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Invalid link record';
  end if;
  if p_url is null or length(p_url) > 500 or
     p_url !~ '^https://drive\.google\.com/(file/d/[A-Za-z0-9_-]{10,200}(/(view|preview|edit))?/?|open)([?][A-Za-z0-9_=&.%-]*)?$' then
    raise exception 'Paste a Google Drive file link';
  end if;
  file_id := coalesce(
    substring(p_url from '/file/d/([A-Za-z0-9_-]{10,200})'),
    substring(p_url from '[?&]id=([A-Za-z0-9_-]{10,200})(&|$)')
  );
  if file_id is null then raise exception 'Paste a Google Drive file link'; end if;
  link := 'https://drive.google.com/file/d/' || file_id || '/view';
  if length(trim(coalesce(p_title, ''))) not between 1 and 160 or
     p_purpose is null or p_purpose not in ('website', 'youtube', 'archive') or
     length(coalesce(p_note, '')) > 1000 then
    raise exception 'Check the title, purpose and note';
  end if;
  begin
    insert into public.media_asset_reviews
      (asset_path, storage_provider, external_url, title, purpose, note, submitted_by)
    values (p_path, 'google_drive', link, trim(p_title), p_purpose, nullif(trim(p_note), ''), auth.uid())
    on conflict (asset_path) do update set
      external_url = excluded.external_url, title = excluded.title, purpose = excluded.purpose,
      note = excluded.note, submitted_by = auth.uid(), submitted_at = now()
    where media_asset_reviews.status = 'in_review'
      and media_asset_reviews.storage_provider = 'google_drive';
  exception when unique_violation then
    raise exception 'This Drive video is already in the vault';
  end;
  if not found then raise exception 'The review is already closed'; end if;
end $$;
revoke all on function public.submit_media_link(text,text,text,text,text) from public, anon;
grant execute on function public.submit_media_link(text,text,text,text,text) to authenticated;

-- Captions may be written for linked videos as well as uploaded files.
drop policy media_caption_insert on public.media_captions;
create policy media_caption_insert on public.media_captions for insert to authenticated
  with check (
    (select public.can_use_media_vault()) and updated_by = (select auth.uid()) and (
      exists (select 1 from storage.objects o
              where o.bucket_id = 'staff-media-vault' and o.name = media_captions.asset_path) or
      exists (select 1 from public.media_asset_reviews r
              where r.asset_path = media_captions.asset_path and r.storage_provider = 'google_drive')
    )
  );

commit;
