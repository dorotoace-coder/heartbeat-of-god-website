-- Program directory: report worker and member evidence independently and send
-- conflicting identifiers to review instead of classifying them silently.
-- Read-only RPC. No table, grant or data changes besides the function itself.
begin;
drop function if exists public.program_directory_current();
create function public.program_directory_current()
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
  select lower(trim(m.email)) as email, regexp_replace(coalesce(m.phone,''),'[^0-9]','','g') as digits
  from public.member_profile_intake m
  where m.reviewed_at is not null and m.person_id is not null and m.member_type='member'
 ), evidence as (
  select d.*,
   se.departments,
   exists(select 1 from members m where m.email=d.email and length(d.digits)>=7 and m.digits=d.digits) as is_member,
   array_remove(array[
    case when jsonb_array_length(d.review_flags)>0 then 'import_flag' end,
    case when exists(select 1 from dir x where x.email=d.email and x.import_key<>d.import_key) then 'shared_email' end,
    case when length(d.digits)>=7 and exists(select 1 from dir x where x.digits=d.digits and x.email<>d.email) then 'shared_phone' end,
    case when exists(select 1 from members m where m.email=d.email and m.digits<>d.digits) then 'member_details_differ' end
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
revoke all on function public.program_directory_current() from public, anon;
grant execute on function public.program_directory_current() to authenticated;
commit;
