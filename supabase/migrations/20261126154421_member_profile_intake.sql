begin;
create table public.member_profile_intake (
 user_id uuid primary key references auth.users on delete cascade,
 full_name text not null check(length(trim(full_name)) between 1 and 160),
 email text not null,phone text check(length(phone)<=50),address text check(length(address)<=500),
 member_type text not null check(member_type in ('member','visitor','exploring')),
 department_id uuid references public.departments,
 ministry_emails boolean not null default false,
 partnership_invitations boolean not null default false,
 submitted_at timestamptz not null default now(),reviewed_at timestamptz,
 person_id uuid unique references public.congregation_people
);
create table public.member_contact_preferences_log (
 id bigint generated always as identity primary key,user_id uuid not null references auth.users on delete cascade,
 ministry_emails boolean not null,partnership_invitations boolean not null,recorded_at timestamptz not null default now()
);
alter table public.member_profile_intake enable row level security;
alter table public.member_contact_preferences_log enable row level security;
revoke all on public.member_profile_intake,public.member_contact_preferences_log from public,anon,authenticated;
grant select on public.member_profile_intake,public.member_contact_preferences_log to authenticated;
create policy profile_intake_read on public.member_profile_intake for select to authenticated using
 (user_id=(select auth.uid()) or (select public.staff_workspace())='pastor');
create policy contact_log_read on public.member_contact_preferences_log for select to authenticated using
 (user_id=(select auth.uid()) or (select public.staff_workspace())='pastor');
create function public.save_my_member_profile(p_name text,p_phone text,p_address text,p_type text,p_department uuid,p_ministry boolean,p_partnership boolean)
returns void language plpgsql security definer set search_path='' as $$
declare own_id uuid:=auth.uid();own_email text;previous public.member_profile_intake;
begin
 if own_id is null then raise exception 'Sign in first' using errcode='42501';end if;
 select email into strict own_email from auth.users where id=own_id;
 -- Serialize first submissions and edits, preserving a single intake per account.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(own_id::text,0));
 select * into previous from public.member_profile_intake where user_id=own_id for update;
 insert into public.member_profile_intake(user_id,full_name,email,phone,address,member_type,department_id,ministry_emails,partnership_invitations)
 values(own_id,trim(p_name),own_email,nullif(trim(p_phone),''),nullif(trim(p_address),''),p_type,p_department,coalesce(p_ministry,false),coalesce(p_partnership,false))
 on conflict(user_id) do update set full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,address=excluded.address,
 member_type=excluded.member_type,department_id=excluded.department_id,ministry_emails=excluded.ministry_emails,
 partnership_invitations=excluded.partnership_invitations,submitted_at=now(),reviewed_at=null;
 if previous.user_id is null or previous.ministry_emails is distinct from coalesce(p_ministry,false)
 or previous.partnership_invitations is distinct from coalesce(p_partnership,false) then
 insert into public.member_contact_preferences_log(user_id,ministry_emails,partnership_invitations)
 values(own_id,coalesce(p_ministry,false),coalesce(p_partnership,false));end if;
end $$;
create function public.review_member_profile(p_user uuid,p_person uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare request public.member_profile_intake;target uuid;
begin
 if public.staff_workspace() is distinct from 'pastor' then raise exception 'Pastor access required' using errcode='42501';end if;
 select * into strict request from public.member_profile_intake where user_id=p_user for update;
 if request.person_id is not null and p_person is not null and request.person_id<>p_person then
 raise exception 'Profile is already linked; review the existing link first';end if;
 target:=coalesce(request.person_id,p_person);
 if target is null then
 insert into public.congregation_people(full_name,phone,address,created_by)
 values(request.full_name,request.phone,request.address,auth.uid()) returning id into target;
 else
 if exists(select 1 from public.member_profile_intake where person_id=target and user_id<>p_user) then
 raise exception 'That directory record is already linked to another account';end if;
 update public.congregation_people set full_name=request.full_name,phone=request.phone,address=request.address where id=target;
 if not found then raise exception 'Directory record not found';end if;
 end if;
 update public.member_profile_intake set person_id=target,reviewed_at=now() where user_id=p_user;
 return target;
end $$;
revoke all on function public.save_my_member_profile(text,text,text,text,uuid,boolean,boolean),public.review_member_profile(uuid,uuid) from public,anon;
grant execute on function public.save_my_member_profile(text,text,text,text,uuid,boolean,boolean),public.review_member_profile(uuid,uuid) to authenticated;
commit;
