begin;
create table public.outreach_workers(user_id uuid primary key references auth.users, full_name text not null);
create table public.outreach_visits(
 id uuid primary key, visit_date date not null, location text not null check(length(trim(location)) between 1 and 200),
 people_reached integer not null check(people_reached>=0), recorded_by uuid not null default auth.uid() references auth.users
);
create table public.outreach_contacts(
 id uuid primary key default gen_random_uuid(), visit_id uuid not null references public.outreach_visits,
 full_name text not null check(length(trim(full_name)) between 1 and 160),phone text,address text,
 followup_date date, assigned_to uuid references public.outreach_workers, completed_at timestamptz,
 invited_to_christ boolean not null default false, contact_permission boolean not null, check((followup_date is null)=(assigned_to is null)), check(contact_permission or (phone is null and address is null and followup_date is null))
);
alter table public.outreach_workers enable row level security;
alter table public.outreach_visits enable row level security;
alter table public.outreach_contacts enable row level security;
revoke all on public.outreach_workers,public.outreach_visits,public.outreach_contacts from public,anon,authenticated;
grant select on public.outreach_workers,public.outreach_visits,public.outreach_contacts to authenticated;
create or replace function public.staff_workspace() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.treasury_portal_access where user_id = auth.uid() and office = 'pastor') then 'pastor'
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
create policy outreach_directory on public.outreach_workers for select to authenticated using(public.staff_workspace() in ('pastor','evangelism'));
create policy outreach_visit_read on public.outreach_visits for select to authenticated using(public.staff_workspace()='pastor' or (public.staff_workspace()='evangelism' and recorded_by=auth.uid()));
create policy outreach_contact_read on public.outreach_contacts for select to authenticated using(public.staff_workspace()='pastor' or
 (public.staff_workspace()='evangelism' and (assigned_to=auth.uid() or exists(select 1 from public.outreach_visits v where v.id=visit_id and v.recorded_by=auth.uid()))));

create function public.register_outreach_worker(p_email text,p_name text) returns void
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if public.staff_workspace() is distinct from 'pastor' then raise exception 'Pastor access required' using errcode='42501'; end if;
 select id into strict target from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
 if exists(select 1 from public.foundation_teachers where id=target)
    or exists(select 1 from public.media_vault_staff where user_id=target)
    or exists(select 1 from public.service_attendance_access where user_id=target)
    or exists(select 1 from public.treasury_portal_access where user_id=target) then
   raise exception 'This account already has a department assignment';
 end if;
 insert into public.outreach_workers(user_id,full_name) values(target,trim(p_name))
 on conflict(user_id) do update set full_name=excluded.full_name;
exception when no_data_found then raise exception 'A confirmed staff sign-in is required';
end $$;
create or replace function public.register_foundation_teacher(p_email text,p_name text,p_trained_on date)
returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if public.staff_workspace() is distinct from 'pastor' then raise exception 'Pastor access required' using errcode='42501'; end if;
 select id into strict target from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
 if exists(select 1 from public.outreach_workers where user_id=target)
    or exists(select 1 from public.media_vault_staff where user_id=target)
    or exists(select 1 from public.service_attendance_access where user_id=target)
    or exists(select 1 from public.treasury_portal_access where user_id=target) then
   raise exception 'This account already has a department assignment';
 end if;
 insert into public.foundation_teachers(id,full_name,trained_on) values(target,trim(p_name),p_trained_on)
 on conflict(id) do update set full_name=excluded.full_name,trained_on=excluded.trained_on;
exception when no_data_found then raise exception 'A confirmed staff sign-in is required';
end $$;

create function public.record_outreach(p_id uuid,p_date date,p_location text,p_reached integer,p_contacts jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if coalesce(public.staff_workspace(),'') not in ('pastor','evangelism') then raise exception 'Outreach access required'; end if;
 if jsonb_typeof(p_contacts) is distinct from 'array' or jsonb_array_length(p_contacts)>p_reached then raise exception 'Check the contact list and total reached'; end if;
 insert into public.outreach_visits(id,visit_date,location,people_reached) values(p_id,p_date,trim(p_location),p_reached) on conflict(id) do nothing;
 if not found then
   if exists(select 1 from public.outreach_visits where id=p_id and recorded_by=auth.uid()) then return; end if;
   raise exception 'Visit unavailable';
 end if;
 insert into public.outreach_contacts(visit_id,full_name,phone,address,invited_to_christ,contact_permission,followup_date,assigned_to)
 select p_id,trim(c.name),nullif(trim(c.phone),''),nullif(trim(c.address),''),coalesce(c.invited,false),c.permission,c.due,c.worker
 from jsonb_to_recordset(p_contacts) as c(name text,phone text,address text,invited boolean,permission boolean,due date,worker uuid);
end $$;
create function public.complete_outreach_followup(p_contact uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 update public.outreach_contacts set completed_at=coalesce(completed_at,now())
 where id=p_contact and followup_date is not null and (public.staff_workspace()='pastor' or
 (public.staff_workspace()='evangelism' and assigned_to=auth.uid()));
 if not found then raise exception 'Follow-up unavailable'; end if;
end $$;
create function public.assign_outreach_followup(p_contact uuid,p_worker uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.outreach_workers where user_id=p_worker) then
   raise exception 'Choose an outreach worker';
 end if;
 update public.outreach_contacts set assigned_to=p_worker
 where id=p_contact and followup_date is not null and completed_at is null and
 (public.staff_workspace()='pastor' or
  (public.staff_workspace()='evangelism' and assigned_to=auth.uid()));
 if not found then raise exception 'Follow-up unavailable' using errcode='42501'; end if;
end $$;
revoke all on function public.register_outreach_worker(text,text),public.record_outreach(uuid,date,text,integer,jsonb), public.complete_outreach_followup(uuid), public.assign_outreach_followup(uuid,uuid) from public,anon;
grant execute on function public.register_outreach_worker(text,text),public.record_outreach(uuid,date,text,integer,jsonb), public.complete_outreach_followup(uuid), public.assign_outreach_followup(uuid,uuid) to authenticated;
commit;
