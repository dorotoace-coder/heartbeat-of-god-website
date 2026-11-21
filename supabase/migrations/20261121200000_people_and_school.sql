begin;

create table public.congregation_people (
 id uuid primary key default gen_random_uuid(),
 full_name text not null check (length(trim(full_name)) between 1 and 160),
 phone text, address text, social_contact text,
 first_visit date, requests_school boolean not null default false,
 created_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now()
);
alter table public.congregation_people enable row level security;
revoke all on public.congregation_people from public, anon, authenticated;
grant select on public.congregation_people to authenticated;
grant insert (id,full_name,phone,address,social_contact,first_visit,requests_school),
 update (full_name,phone,address,social_contact,first_visit,requests_school) on public.congregation_people to authenticated;
create policy people_pastor_read on public.congregation_people for select to authenticated using ((select public.staff_workspace())='pastor');
create policy people_intake on public.congregation_people for insert to authenticated with check
 ((select public.staff_workspace()) in ('pastor','attendance') and created_by=(select auth.uid()));
create policy people_edit on public.congregation_people for update to authenticated using ((select public.staff_workspace())='pastor') with check ((select public.staff_workspace())='pastor');

create table public.foundation_teachers (
 id uuid primary key references auth.users,
 full_name text not null check (length(trim(full_name)) > 0),
 trained_on date not null
);
create table public.foundation_classes (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) > 0),
 starts_on date not null check (extract(dow from starts_on)=0),
 teacher_id uuid references public.foundation_teachers
);
create table public.foundation_students (
 class_id uuid references public.foundation_classes not null,
 person_id uuid references public.congregation_people not null,
 graduated_on date,
 primary key (class_id, person_id)
);
create table public.foundation_roll (
 class_id uuid not null, person_id uuid not null,
 week smallint not null check (week between 1 and 4),
 present boolean not null,
 primary key(class_id,person_id,week),
 foreign key(class_id,person_id) references public.foundation_students
);
alter table public.foundation_teachers enable row level security;
alter table public.foundation_classes enable row level security;
alter table public.foundation_students enable row level security;
alter table public.foundation_roll enable row level security;

do $$
declare t text;
begin
 foreach t in array array['foundation_teachers','foundation_classes','foundation_students','foundation_roll'] loop
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update on public.%I to authenticated',t);
  execute format('create policy school_pastor on public.%I for all to authenticated using ((select public.staff_workspace())=''pastor'') with check ((select public.staff_workspace())=''pastor'')',t);
 end loop;
end $$;
create or replace function public.staff_workspace() returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.treasury_portal_access where user_id = auth.uid() and office = 'pastor') then 'pastor'
    when count(*) = 1 then min(department)
  end
  from (
    select 'school'::text as department from public.foundation_teachers where id = auth.uid()
    union all
    select 'media'::text as department from public.media_vault_staff where user_id = auth.uid()
    union all
    select 'attendance' from public.service_attendance_access where user_id = auth.uid() and can_submit
    union all
    select 'treasury' from public.treasury_portal_access where user_id = auth.uid() and office = 'treasury_leader'
  ) departments;
$$;
create policy assigned_classes on public.foundation_classes for select to authenticated using (teacher_id=(select auth.uid()) and (select public.staff_workspace())='school');
create policy assigned_students on public.foundation_students for select to authenticated using
 ((select public.staff_workspace())='school' and exists(select 1 from public.foundation_classes c where c.id=class_id and c.teacher_id=(select auth.uid())));
create policy teacher_roll on public.foundation_roll for all to authenticated using
 ((select public.staff_workspace())='school' and exists(select 1 from public.foundation_classes c where c.id=class_id and c.teacher_id=(select auth.uid()))) with check
 ((select public.staff_workspace())='school' and exists(select 1 from public.foundation_classes c where c.id=class_id and c.teacher_id=(select auth.uid())));
-- Teachers receive names for their own class without access to member contact details.
create function public.foundation_roster(p_class uuid) returns table(person_id uuid, full_name text)
language sql stable security definer set search_path='' as $$
 select p.id,p.full_name from public.foundation_students s join public.congregation_people p on p.id=s.person_id
 join public.foundation_classes c on c.id=s.class_id where c.id=p_class and
 ((c.teacher_id=auth.uid() and public.staff_workspace()='school') or public.staff_workspace()='pastor') order by p.full_name,p.id;
$$;
revoke all on function public.foundation_roster(uuid) from public,anon;
grant execute on function public.foundation_roster(uuid) to authenticated;
create function public.register_foundation_teacher(p_email text, p_name text, p_trained_on date)
returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if public.staff_workspace() is distinct from 'pastor' then
   raise exception 'Pastor access required';
 end if;
 select id into strict target from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
 if exists(select 1 from public.media_vault_staff where user_id=target)
    or exists(select 1 from public.service_attendance_access where user_id=target)
    or exists(select 1 from public.treasury_portal_access where user_id=target) then
   raise exception 'This account already has a department assignment';
 end if;
 insert into public.foundation_teachers(id,full_name,trained_on) values(target,trim(p_name),p_trained_on)
 on conflict(id) do update set full_name=excluded.full_name, trained_on=excluded.trained_on;
exception when no_data_found then raise exception 'A confirmed staff sign-in is required';
end $$;
revoke all on function public.register_foundation_teacher(text,text,date) from public,anon;
grant execute on function public.register_foundation_teacher(text,text,date) to authenticated;
revoke insert, update on public.foundation_teachers from authenticated;
commit;
