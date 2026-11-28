-- A second administrator (profiles.role = 'owner') opens the Pastor workspace.
-- Treasury is unchanged: every Treasury, partnership-money and receipt rule checks
-- treasury_portal_access / treasury_members directly, so an administrator without
-- the Treasury Pastor seat still cannot read or change any of it.
-- Which account is an administrator is set as data at release, never in this file.
begin;

create or replace function public.staff_workspace() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.treasury_portal_access where user_id = auth.uid() and office = 'pastor') then 'pastor'
    when exists (select 1 from public.profiles where id = auth.uid() and role = 'owner') then 'pastor'
    when count(*) = 1 then min(department)
  end
  from (
    select 'evangelism'::text as department from public.outreach_workers where user_id=auth.uid()
    union all
    select 'school'::text as department from public.foundation_teachers where id = auth.uid()
    union all
    select 'media'::text as department from public.media_vault_staff where user_id = auth.uid()
    union all
    select 'attendance' from public.service_attendance_access where user_id = auth.uid() and can_submit
    union all
    select 'treasury' from public.treasury_portal_access where user_id = auth.uid() and office = 'treasury_leader'
  ) departments;
$$;

-- Staff access list: show administrators as such.
create or replace function public.pastor_staff_access()
returns table(user_id uuid, email text, full_name text, department text, account_confirmed boolean, last_sign_in_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with roles as (
    select user_id, office::text as department from public.treasury_portal_access
    union all
    select id, 'administrator'::text from public.profiles where role = 'owner'
    union all
    select user_id, 'media'::text from public.media_vault_staff
    union all
    select user_id, case when can_submit then 'attendance' else 'service_lead' end
      from public.service_attendance_access
    union all
    select id, 'foundation_school'::text from public.foundation_teachers
    union all
    select user_id, 'evangelism'::text from public.outreach_workers
  ), assignments as (
    select roles.user_id,
      case when bool_or(roles.department = 'pastor') then 'pastor'
           when bool_or(roles.department = 'administrator') then 'administrator'
           when count(distinct roles.department) = 1 then min(roles.department)
           else 'multiple_assignments' end as department
    from roles group by roles.user_id
  )
  select u.id, u.email::text,
    coalesce(nullif(trim(p.full_name), ''), nullif(trim(t.full_name), ''),
             nullif(trim(o.full_name), ''), u.email::text),
    a.department, u.email_confirmed_at is not null, u.last_sign_in_at
  from assignments a
  join auth.users u on u.id = a.user_id
  left join public.profiles p on p.id = a.user_id
  left join public.foundation_teachers t on t.id = a.user_id
  left join public.outreach_workers o on o.user_id = a.user_id
  where public.staff_workspace() = 'pastor'
  order by case when a.department = 'pastor' then 0 when a.department = 'administrator' then 1 else 2 end,
           lower(coalesce(nullif(trim(p.full_name), ''), u.email::text));
$$;
commit;
