begin;
create function public.program_directory_current()
returns table(import_key text,display_name text,email text,phone_original text,programs jsonb,review_flags jsonb,relationship text,attendance text)
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='owner') then
  raise exception 'Owner access required' using errcode='42501';
 end if;
 return query
 with workers as (
  select user_id from public.outreach_workers
  union select user_id from public.media_vault_staff
  union select user_id from public.service_attendance_access where can_submit
  union select user_id from public.treasury_portal_access
  union select id from public.foundation_teachers
 ), matches as (
  select d.*,
   jsonb_array_length(d.review_flags)>0 or (select count(*) from public.program_outreach_directory x where x.email=d.email)>1 as ambiguous,
   exists(select 1 from auth.users u join workers w on w.user_id=u.id where lower(trim(u.email))=d.email) as worker_match,
   exists(select 1 from public.member_profile_intake m where lower(trim(m.email))=d.email
    and m.reviewed_at is not null and m.person_id is not null and m.member_type='member'
    and length(regexp_replace(d.phone_original,'[^0-9]','','g'))>=7
    and regexp_replace(m.phone,'[^0-9]','','g')=regexp_replace(d.phone_original,'[^0-9]','','g')) as member_match,
   exists(select 1 from public.mta_registrations r join public.mta_event_attendance a on a.registration_id=r.id
    where lower(trim(r.email))=d.email and not a.reversed
    and length(regexp_replace(d.phone_original,'[^0-9]','','g'))>=7
    and regexp_replace(r.phone,'[^0-9]','','g')=regexp_replace(d.phone_original,'[^0-9]','','g')) as attended
  from public.program_outreach_directory d
 ) select m.import_key,m.display_name,m.email,m.phone_original,m.programs,m.review_flags,
 case when m.ambiguous then 'review' when m.worker_match then 'worker' when m.member_match then 'member' else 'unconfirmed' end,
 case when m.ambiguous then 'unknown' when m.attended then 'mta_attended' else 'unknown' end
 from matches m order by m.display_name;
end $$;
revoke all on function public.program_directory_current() from public,anon;
grant execute on function public.program_directory_current() to authenticated;
commit;
