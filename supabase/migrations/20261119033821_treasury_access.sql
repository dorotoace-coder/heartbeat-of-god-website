begin;

-- Assign the two named accounts through a trusted database administration
-- session. Portal users cannot create or change these assignments.
create table public.treasury_portal_access (
  church_id uuid not null,
  office text not null check (office in ('pastor', 'treasury_leader')),
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (church_id, office),
  unique (church_id, user_id)
);

alter table public.treasury_portal_access enable row level security;
revoke all on public.treasury_portal_access from anon, authenticated;
grant select on public.treasury_portal_access to authenticated;
create policy treasury_portal_access_self on public.treasury_portal_access
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.treasury_has_role(p_church uuid, p_roles public.treasury_role[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.treasury_members m
    join public.treasury_portal_access a using (church_id, user_id)
    where m.church_id = p_church and m.user_id = (select auth.uid())
      and m.active and m.role = any (p_roles)
  );
$$;

create or replace function public.treasury_has_role_text(p_church text, p_roles public.treasury_role[])
returns boolean
language sql stable security invoker
set search_path = ''
as $$
  select case
    when p_church ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then public.treasury_has_role(p_church::uuid, p_roles)
    else false
  end;
$$;

alter view public.treasury_monthly_summary set (security_invoker = true);
revoke all on public.treasury_monthly_summary from anon;
grant select on public.treasury_monthly_summary to authenticated;

commit;
