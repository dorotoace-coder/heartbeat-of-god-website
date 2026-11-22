begin;

-- Last sign-in is historical evidence. This function does not report live sessions.
create function public.pastor_staff_access()
returns table (
  user_id uuid,
  email text,
  full_name text,
  department text,
  account_confirmed boolean,
  last_sign_in_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  with roles as (
    select user_id, office::text as department from public.treasury_portal_access
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
  order by case when a.department = 'pastor' then 0 else 1 end,
           lower(coalesce(nullif(trim(p.full_name), ''), u.email::text));
$$;

revoke all on function public.pastor_staff_access() from public, anon, authenticated;
grant execute on function public.pastor_staff_access() to authenticated;

commit;
