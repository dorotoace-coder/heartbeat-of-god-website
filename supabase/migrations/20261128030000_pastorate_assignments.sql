begin;
create function training_private.is_lead_pastor() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='owner');
$$;
revoke all on function training_private.is_lead_pastor() from public,anon;
grant execute on function training_private.is_lead_pastor() to authenticated;
create table public.pastorate_assignments (
 user_id uuid primary key references auth.users,
 display_name text not null check(length(trim(display_name)) between 1 and 160),
 responsibility text not null check(length(trim(responsibility)) between 3 and 160),
 assignment text not null check(length(trim(assignment)) between 5 and 2000),
 review_on date not null,
 active boolean not null default true,
 approved_by uuid not null default auth.uid() references auth.users
);
alter table public.pastorate_assignments enable row level security;
revoke all on public.pastorate_assignments from public,anon,authenticated;
grant select,insert,update on public.pastorate_assignments to authenticated;
create policy pastorate_read on public.pastorate_assignments for select to authenticated using
(training_private.is_lead_pastor() or (user_id=auth.uid() and active));
create policy pastorate_insert on public.pastorate_assignments for insert to authenticated with check
(training_private.is_lead_pastor() and approved_by=auth.uid());
create policy pastorate_update on public.pastorate_assignments for update to authenticated using
(training_private.is_lead_pastor()) with check(training_private.is_lead_pastor() and approved_by=auth.uid());
create function public.pastorate_is_lead() returns boolean language sql stable security invoker set search_path='' as $$
 select training_private.is_lead_pastor();
$$;
create function public.pastorate_find_account(p_email text) returns uuid language plpgsql stable security definer set search_path='' as $$
declare account_id uuid;
begin
 if not training_private.is_lead_pastor() then raise exception 'Lead Pastor access required' using errcode='42501'; end if;
 select id into account_id from auth.users where lower(email)=lower(trim(p_email));
 if account_id is null then raise exception 'No existing account matches that email'; end if;
 return account_id;
end $$;
revoke all on function public.pastorate_is_lead(),public.pastorate_find_account(text) from public,anon;
grant execute on function public.pastorate_is_lead(),public.pastorate_find_account(text) to authenticated;
commit;
