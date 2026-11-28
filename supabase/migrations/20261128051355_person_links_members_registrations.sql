-- Identity linking, release C2.
-- Member profile review writes to the link log and can be undone; Mighty Turn
-- Around registrations link by their record id; a person's linked records and
-- earlier details can be read and restored. Owner account only throughout.
begin;

alter table public.person_source_links drop constraint person_source_links_evidence_check;
alter table public.person_source_links add constraint person_source_links_evidence_check
 check (cardinality(evidence) between 1 and 7 and evidence <@ array[
  'same_email','same_phone','same_name','confirmed_in_person','confirmed_by_message','known_to_pastor','profile_review']::text[]);

-- Reviews made before the log existed.
insert into public.person_source_links(id, person_id, source_type, source_key, evidence, note, linked_by, linked_at)
select gen_random_uuid(), m.person_id, 'member_profile', m.user_id::text, array['profile_review'],
 'Reviewed before the link log existed', owner.id, coalesce(m.reviewed_at, now())
from public.member_profile_intake m
cross join (select id from public.profiles where role='owner' order by id limit 1) owner
where m.person_id is not null
on conflict do nothing;

-- Same signature and messages as before. Now owner only, and each link is logged.
-- Earlier person details are kept by the revision trigger.
create or replace function public.review_member_profile(p_user uuid,p_person uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare request public.member_profile_intake; target uuid; person public.congregation_people;
 active public.person_source_links; found_evidence text[] := array['profile_review']; digits text;
begin
 perform public.require_person_owner();
 select * into strict request from public.member_profile_intake where user_id=p_user for update;
 if request.person_id is not null and p_person is not null and request.person_id<>p_person then
  raise exception 'Profile is already linked; review the existing link first';
 end if;
 target:=coalesce(request.person_id,p_person);
 select * into active from public.person_source_links where source_type='member_profile' and source_key=p_user::text and unlinked_at is null;
 if active.id is not null and active.person_id is distinct from target then
  raise exception 'Profile is already linked; review the existing link first';
 end if;
 if target is null then
  insert into public.congregation_people(full_name,phone,address,created_by)
  values(request.full_name,request.phone,request.address,auth.uid()) returning id into target;
 else
  select * into person from public.congregation_people where id=target for update;
  if not found then raise exception 'Directory record not found'; end if;
  if exists(select 1 from public.member_profile_intake where person_id=target and user_id<>p_user) then
   raise exception 'That directory record is already linked to another account';
  end if;
  -- Compare before the details are replaced.
  if lower(trim(person.full_name))=lower(trim(request.full_name)) then
   found_evidence := array_append(found_evidence,'same_name');
  end if;
  digits := regexp_replace(coalesce(request.phone,''),'[^0-9]','','g');
  if length(digits)>=7 and regexp_replace(coalesce(person.phone,''),'[^0-9]','','g')=digits then
   found_evidence := array_append(found_evidence,'same_phone');
  end if;
  update public.congregation_people set full_name=request.full_name,phone=request.phone,address=request.address where id=target;
 end if;
 update public.member_profile_intake set person_id=target,reviewed_at=now() where user_id=p_user;
 if active.id is null then
  insert into public.person_source_links(id,person_id,source_type,source_key,evidence,linked_by)
  values(gen_random_uuid(),target,'member_profile',p_user::text,found_evidence,auth.uid());
 end if;
 return target;
end $$;

-- Link a directory contact or a Mighty Turn Around registration. Retry safe.
create or replace function public.person_link(
 p_link uuid, p_source_type text, p_source_key text, p_person uuid,
 p_evidence text[], p_note text, p_identity_checked boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare source_name text; source_phone text; existing public.person_source_links; target uuid; clean_note text := nullif(trim(p_note),'');
begin
 perform public.require_person_owner();
 if p_source_type is null or p_source_type not in ('directory_contact','mta_registration') then
  raise exception 'Unsupported source' using errcode='22023';
 end if;
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
 if p_source_type='directory_contact' then
  select trim(display_name), nullif(trim(phone_original),'') into source_name, source_phone
   from public.program_outreach_directory where import_key=p_source_key;
 else
  select left(trim(r.full_name),160), nullif(trim(r.phone),'') into source_name, source_phone
   from public.mta_registrations r where r.id::text=p_source_key;
 end if;
 if source_name is null then raise exception 'Source record not found' using errcode='HB013'; end if;
 if exists(select 1 from public.person_source_links where source_type=p_source_type and source_key=p_source_key and unlinked_at is null) then
  raise exception 'This record is already linked' using errcode='HB011';
 end if;
 if p_person is null then
  insert into public.congregation_people(full_name, phone, origin, created_by)
  values (source_name, source_phone, 'program_directory', auth.uid()) returning id into target;
 else
  select id into target from public.congregation_people where id=p_person;
  if not found then raise exception 'Person not found' using errcode='HB012'; end if;
 end if;
 begin
  insert into public.person_source_links(id, person_id, source_type, source_key, evidence, note, linked_by)
  values (p_link, target, p_source_type, p_source_key, p_evidence, clean_note, auth.uid());
 exception when unique_violation then
  if exists(select 1 from public.person_source_links where source_type=p_source_type and source_key=p_source_key and unlinked_at is null and id<>p_link) then
   raise exception 'This record is already linked' using errcode='HB011';
  end if;
  raise;
 end;
 return target;
end $$;

-- Closing a member profile link also returns that profile to the review queue.
create or replace function public.person_unlink(p_link uuid, p_reason text) returns void
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
 if link.source_type='member_profile' then
  update public.member_profile_intake set person_id=null, reviewed_at=null
   where user_id::text=link.source_key and person_id=link.person_id;
 end if;
end $$;

-- Mighty Turn Around registrations sharing a directory contact's email.
create function public.person_registrations(p_contact_key text)
returns table(registration_id uuid, full_name text, registered_at timestamptz, same_phone boolean, linked_person uuid, link_id uuid)
language plpgsql stable security definer set search_path='' as $$
declare contact public.program_outreach_directory; digits text;
begin
 perform public.require_person_owner();
 select * into contact from public.program_outreach_directory d where d.import_key=p_contact_key;
 if not found then raise exception 'Directory contact not found' using errcode='HB013'; end if;
 digits := regexp_replace(contact.phone_original,'[^0-9]','','g');
 return query
 select r.id, r.full_name, r.created_at,
  length(digits)>=7 and regexp_replace(coalesce(r.phone,''),'[^0-9]','','g')=digits,
  l.person_id, l.id
 from public.mta_registrations r
 left join public.person_source_links l on l.source_type='mta_registration' and l.source_key=r.id::text and l.unlinked_at is null
 where lower(trim(r.email))=contact.email
 order by r.created_at, r.id;
end $$;

-- A person's linked records and their directory follow-ups, newest first.
create function public.person_records(p_person uuid)
returns table(record_kind text, link_id uuid, title text, detail text, occurred_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.require_person_owner();
 return query
 with links as (
  select l.id, l.source_type, l.source_key, l.linked_at from public.person_source_links l
  where l.person_id=p_person and l.unlinked_at is null
 )
 select 'directory_contact'::text, l.id, coalesce(d.display_name,'Record no longer available'),
   (select string_agg(program, ', ') from jsonb_array_elements_text(d.programs) program), l.linked_at
  from links l left join public.program_outreach_directory d on d.import_key=l.source_key
  where l.source_type='directory_contact'
 union all
 select 'member_profile'::text, l.id, coalesce(m.full_name,'Record no longer available'),
   case when m.user_id is null then null when m.reviewed_at is null then 'awaiting review' else m.member_type end, l.linked_at
  from links l left join public.member_profile_intake m on m.user_id::text=l.source_key
  where l.source_type='member_profile'
 union all
 select 'mta_registration'::text, l.id, coalesce(r.full_name,'Record no longer available'), null::text, coalesce(r.created_at, l.linked_at)
  from links l left join public.mta_registrations r on r.id::text=l.source_key
  where l.source_type='mta_registration'
 union all
 select 'followup'::text, null::uuid, f.full_name,
   case when f.completed_at is null then 'open, next contact ' || f.followup_date
        when f.closure_outcome='declined' then 'asked for no further contact' else 'completed' end, f.created_at
  from public.ministry_followup_requests f
  where f.directory_import_key in (select l.source_key from links l where l.source_type='directory_contact')
 order by 5 desc;
end $$;

-- Put earlier details back. The details being replaced are saved too.
create function public.person_restore(p_revision bigint) returns void
language plpgsql security definer set search_path='' as $$
declare revision public.person_revisions;
begin
 perform public.require_person_owner();
 select * into revision from public.person_revisions where id=p_revision;
 if not found then raise exception 'Earlier details not found' using errcode='HB017'; end if;
 update public.congregation_people set full_name=revision.full_name, phone=revision.phone,
  address=revision.address, social_contact=revision.social_contact where id=revision.person_id;
end $$;

revoke all on function public.person_registrations(text), public.person_records(uuid), public.person_restore(bigint)
 from public, anon, authenticated;
grant execute on function public.person_registrations(text), public.person_records(uuid), public.person_restore(bigint)
 to authenticated;

-- Membership also counts through a reviewed link, even when the email differs.
-- A differing phone no longer needs review when that member is the linked person.
create or replace function public.program_directory_current()
returns table(
 import_key text, display_name text, email text, phone_original text,
 programs jsonb, review_flags jsonb, relationship text, attendance text,
 worker_match boolean, member_match boolean, worker_departments text[], review_reasons text[]
)
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='owner') then
  raise exception 'Owner access required' using errcode='42501';
 end if;
 return query
 with dir as (
  select d.*, regexp_replace(d.phone_original,'[^0-9]','','g') as digits
  from public.program_outreach_directory d
 ), staff as (
  select user_id, 'evangelism'::text as department from public.outreach_workers
  union select user_id, 'media' from public.media_vault_staff
  union select user_id, 'attendance' from public.service_attendance_access where can_submit
  union select user_id, 'treasury' from public.treasury_portal_access
  union select id, 'school' from public.foundation_teachers
 ), staff_email as (
  select lower(trim(u.email)) as email, array_agg(distinct s.department order by s.department) as departments
  from auth.users u join staff s on s.user_id=u.id group by 1
 ), members as (
  select lower(trim(m.email)) as email, regexp_replace(coalesce(m.phone,''),'[^0-9]','','g') as digits, m.person_id
  from public.member_profile_intake m
  where m.reviewed_at is not null and m.person_id is not null and m.member_type='member'
 ), linked as (
  select l.source_key, l.person_id from public.person_source_links l
  where l.source_type='directory_contact' and l.unlinked_at is null
 ), evidence as (
  select d.*,
   se.departments,
   (exists(select 1 from members m where m.email=d.email and length(d.digits)>=7 and m.digits=d.digits)
    or exists(select 1 from linked k join members m on m.person_id=k.person_id where k.source_key=d.import_key)) as is_member,
   array_remove(array[
    case when jsonb_array_length(d.review_flags)>0 then 'import_flag' end,
    case when exists(select 1 from dir x where x.email=d.email and x.import_key<>d.import_key) then 'shared_email' end,
    case when length(d.digits)>=7 and exists(select 1 from dir x where x.digits=d.digits and x.email<>d.email) then 'shared_phone' end,
    case when exists(select 1 from members m where m.email=d.email and m.digits<>d.digits
      and not exists(select 1 from linked k where k.source_key=d.import_key and k.person_id=m.person_id)) then 'member_details_differ' end
   ], null) as reasons,
   exists(select 1 from public.mta_registrations r join public.mta_event_attendance a on a.registration_id=r.id
    where lower(trim(r.email))=d.email and not a.reversed and length(d.digits)>=7
    and regexp_replace(coalesce(r.phone,''),'[^0-9]','','g')=d.digits) as attended
  from dir d left join staff_email se on se.email=d.email
 ) select e.import_key, e.display_name, e.email, e.phone_original, e.programs, e.review_flags,
  case when cardinality(e.reasons)>0 then 'review' when e.departments is not null then 'worker'
   when e.is_member then 'member' else 'unconfirmed' end,
  case when cardinality(e.reasons)>0 then 'unknown' when e.attended then 'mta_attended' else 'unknown' end,
  e.departments is not null, e.is_member, coalesce(e.departments, '{}'::text[]), e.reasons
 from evidence e order by e.display_name, e.import_key;
end $$;
commit;
