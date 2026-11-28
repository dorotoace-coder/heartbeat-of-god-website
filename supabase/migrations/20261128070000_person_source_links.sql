-- Identity linking, release C1: link program directory contacts to people.
-- Links are a reviewed, reversible log; source records are never edited.
-- Person details keep their earlier values on every change.
-- Only the owner account (the same rule as reading the directory) links or unlinks.
begin;

-- Where a person record came from. Staff entry keeps the default.
alter table public.congregation_people
 add column origin text not null default 'staff' check (origin in ('staff','program_directory'));

-- Earlier values of a person's details, saved before every change.
create table public.person_revisions (
 id bigint generated always as identity primary key,
 person_id uuid not null references public.congregation_people(id),
 full_name text not null, phone text, address text, social_contact text,
 replaced_at timestamptz not null default now(),
 replaced_by uuid references auth.users(id)
);
create index person_revisions_person on public.person_revisions(person_id, replaced_at desc);

create function public.save_person_revision() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if (old.full_name, old.phone, old.address, old.social_contact) is distinct from
    (new.full_name, new.phone, new.address, new.social_contact) then
  insert into public.person_revisions(person_id, full_name, phone, address, social_contact, replaced_by)
  values (old.id, old.full_name, old.phone, old.address, old.social_contact, auth.uid());
 end if;
 return new;
end $$;
revoke all on function public.save_person_revision() from public, anon, authenticated;
create trigger congregation_people_revision before update on public.congregation_people
 for each row execute function public.save_person_revision();

-- Which source record belongs to which person. Rows are closed, never deleted.
create table public.person_source_links (
 id uuid primary key,
 person_id uuid not null references public.congregation_people(id),
 source_type text not null check (source_type in ('directory_contact','member_profile','mta_registration','outreach_contact')),
 source_key text not null check (length(source_key) between 1 and 200),
 evidence text[] not null check (cardinality(evidence) between 1 and 6 and evidence <@ array[
  'same_email','same_phone','same_name','confirmed_in_person','confirmed_by_message','known_to_pastor']::text[]),
 note text check (note is null or length(note) between 1 and 300),
 linked_by uuid not null references auth.users(id),
 linked_at timestamptz not null default now(),
 unlinked_by uuid references auth.users(id),
 unlinked_at timestamptz,
 unlink_reason text check (unlink_reason is null or length(unlink_reason) between 1 and 300),
 check ((unlinked_at is null) = (unlinked_by is null) and (unlinked_at is null) = (unlink_reason is null))
);
create unique index person_source_links_one_active on public.person_source_links(source_type, source_key) where unlinked_at is null;
create index person_source_links_person on public.person_source_links(person_id) where unlinked_at is null;

alter table public.person_revisions enable row level security;
alter table public.person_source_links enable row level security;
revoke all on public.person_revisions, public.person_source_links from public, anon, authenticated;
grant select on public.person_revisions, public.person_source_links to authenticated;
create policy person_revisions_owner_read on public.person_revisions for select to authenticated
 using (exists(select 1 from public.profiles where id=(select auth.uid()) and role='owner'));
create policy person_source_links_owner_read on public.person_source_links for select to authenticated
 using (exists(select 1 from public.profiles where id=(select auth.uid()) and role='owner'));

create function public.require_person_owner() returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='owner') then
  raise exception 'Owner access required' using errcode='42501';
 end if;
end $$;
revoke all on function public.require_person_owner() from public, anon, authenticated;

-- Possible people for a directory contact, with reasons. Never chooses one.
create function public.person_candidates(p_source_type text, p_source_key text)
returns table(person_id uuid, full_name text, reasons text[], active_links int)
language plpgsql stable security definer set search_path='' as $$
declare contact public.program_outreach_directory; digits text;
begin
 perform public.require_person_owner();
 if p_source_type is distinct from 'directory_contact' then raise exception 'Unsupported source' using errcode='22023'; end if;
 select * into contact from public.program_outreach_directory where import_key=p_source_key;
 if not found then raise exception 'Directory contact not found' using errcode='HB013'; end if;
 digits := regexp_replace(contact.phone_original,'[^0-9]','','g');
 return query
 with reasons as (
  select l.person_id as id, 'same_email'::text as reason
   from public.person_source_links l join public.program_outreach_directory d
    on l.source_type='directory_contact' and d.import_key=l.source_key
   where l.unlinked_at is null and d.email=contact.email and d.import_key<>contact.import_key
  union
  select m.person_id, 'same_email' from public.member_profile_intake m
   where m.person_id is not null and m.reviewed_at is not null and lower(trim(m.email))=contact.email
  union
  select p.id, 'same_phone' from public.congregation_people p
   where length(digits)>=7 and regexp_replace(coalesce(p.phone,''),'[^0-9]','','g')=digits
  union
  select p.id, 'same_name' from public.congregation_people p
   where lower(trim(p.full_name))=lower(trim(contact.display_name))
 )
 select p.id, p.full_name, array_agg(distinct r.reason order by r.reason),
  (select count(*)::int from public.person_source_links l where l.person_id=p.id and l.unlinked_at is null)
 from reasons r join public.congregation_people p on p.id=r.id
 group by p.id, p.full_name
 order by count(distinct r.reason) desc, p.full_name;
end $$;

-- Link a directory contact to a chosen person, or to a new one. Retry safe.
create function public.person_link(
 p_link uuid, p_source_type text, p_source_key text, p_person uuid,
 p_evidence text[], p_note text, p_identity_checked boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare contact public.program_outreach_directory; existing public.person_source_links; target uuid; clean_note text := nullif(trim(p_note),'');
begin
 perform public.require_person_owner();
 if p_source_type is distinct from 'directory_contact' then raise exception 'Unsupported source' using errcode='22023'; end if;
 select * into existing from public.person_source_links where id=p_link;
 if found then
  if existing.source_type=p_source_type and existing.source_key=p_source_key and existing.linked_by=auth.uid()
     and existing.unlinked_at is null and (p_person is null or existing.person_id=p_person)
     and existing.evidence=p_evidence and existing.note is not distinct from clean_note then
   return existing.person_id;
  end if;
  raise exception 'Request identifier already used' using errcode='23505';
 end if;
 if p_link is null or p_identity_checked is distinct from true or p_evidence is null
    or cardinality(p_evidence) not between 1 and 6
    or not p_evidence <@ array['same_email','same_phone','same_name','confirmed_in_person','confirmed_by_message','known_to_pastor']::text[]
    or length(coalesce(clean_note,'')) > 300 then
  raise exception 'Confirm identity and choose the evidence' using errcode='HB014';
 end if;
 select * into contact from public.program_outreach_directory where import_key=p_source_key;
 if not found then raise exception 'Directory contact not found' using errcode='HB013'; end if;
 if exists(select 1 from public.person_source_links where source_type=p_source_type and source_key=p_source_key and unlinked_at is null) then
  raise exception 'This contact is already linked' using errcode='HB011';
 end if;
 if p_person is null then
  insert into public.congregation_people(full_name, phone, origin, created_by)
  values (trim(contact.display_name), nullif(trim(contact.phone_original),''), 'program_directory', auth.uid())
  returning id into target;
 else
  select id into target from public.congregation_people where id=p_person;
  if not found then raise exception 'Person not found' using errcode='HB012'; end if;
 end if;
 begin
  insert into public.person_source_links(id, person_id, source_type, source_key, evidence, note, linked_by)
  values (p_link, target, p_source_type, p_source_key, p_evidence, clean_note, auth.uid());
 exception when unique_violation then
  if exists(select 1 from public.person_source_links where source_type=p_source_type and source_key=p_source_key and unlinked_at is null and id<>p_link) then
   raise exception 'This contact is already linked' using errcode='HB011';
  end if;
  raise;
 end;
 return target;
end $$;

-- Close a link. The person record and the source stay as they are.
create function public.person_unlink(p_link uuid, p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare link public.person_source_links; reason text := nullif(trim(p_reason),'');
begin
 perform public.require_person_owner();
 select * into link from public.person_source_links where id=p_link for update;
 if not found then raise exception 'Link not found' using errcode='HB015'; end if;
 if link.unlinked_at is not null then
  if link.unlinked_by=auth.uid() and link.unlink_reason=reason then return; end if;
  raise exception 'This link was already removed' using errcode='HB016';
 end if;
 if reason is null or length(reason) > 300 then raise exception 'Give a short reason' using errcode='HB014'; end if;
 update public.person_source_links set unlinked_at=now(), unlinked_by=auth.uid(), unlink_reason=reason where id=p_link;
end $$;

revoke all on function public.person_candidates(text,text), public.person_link(uuid,text,text,uuid,text[],text,boolean),
 public.person_unlink(uuid,text) from public, anon, authenticated;
grant execute on function public.person_candidates(text,text), public.person_link(uuid,text,text,uuid,text[],text,boolean),
 public.person_unlink(uuid,text) to authenticated;
commit;
