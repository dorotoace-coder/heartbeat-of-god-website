\set ON_ERROR_STOP on
-- Fictional schema-only fixture. Never run against a ministry database.
do $$begin if current_database() !~ '^training_' then raise exception 'Use a disposable local database named training_*'; end if; end$$;
\set ON_ERROR_STOP on
create schema if not exists auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
create table public.profiles(id uuid primary key references auth.users,full_name text,role text default 'leader',department_id uuid);
create table public.departments(id uuid primary key default gen_random_uuid(),name text);
create table public.congregation_people(id uuid primary key default gen_random_uuid(),full_name text,phone text,address text,social_contact text,requests_school boolean default false);
create table public.foundation_classes(id uuid primary key default gen_random_uuid(),teacher_id uuid references auth.users,title text not null default 'Fictional class',starts_on date default '2026-11-22');
create table public.foundation_students(class_id uuid references public.foundation_classes,person_id uuid references public.congregation_people);
create table public.fixture_pastors(user_id uuid primary key references auth.users);
create function public.staff_workspace() returns text language sql stable security definer set search_path='' as $$select case when exists(select 1 from public.fixture_pastors where user_id=auth.uid()) then 'pastor' else null end$$;
grant usage on schema public,auth to authenticated,anon;
grant execute on function auth.uid(),public.staff_workspace() to authenticated;
insert into auth.users(id,email_confirmed_at) values
 ('11111111-1111-4111-8111-111111111111',now()),
 ('22222222-2222-4222-8222-222222222222',now()),
 ('33333333-3333-4333-8333-333333333333',now()),
 ('44444444-4444-4444-8444-444444444444',now()),
 ('55555555-5555-4555-8555-555555555555',now());
insert into public.fixture_pastors values('11111111-1111-4111-8111-111111111111');

create table public.foundation_roll(class_id uuid references public.foundation_classes,person_id uuid references public.congregation_people,week smallint check(week between 1 and 4),present boolean);
grant select on public.departments,public.profiles,public.congregation_people,public.foundation_classes,public.foundation_students,public.foundation_roll to authenticated;
create function public.pastor_staff_access() returns table(user_id uuid,full_name text) language sql stable security definer set search_path='' as $$select u.id,coalesce(p.full_name,'Fictional worker') from auth.users u left join public.profiles p on p.id=u.id where public.staff_workspace()='pastor'$$;
grant execute on function public.pastor_staff_access() to authenticated;
update auth.users set email=case id::text when '11111111-1111-4111-8111-111111111111' then 'pastor@example.org' when '22222222-2222-4222-8222-222222222222' then 'learner@example.org' when '33333333-3333-4333-8333-333333333333' then 'reviewer@example.org' when '44444444-4444-4444-8444-444444444444' then 'other@example.org' else 'outsider@example.org' end;
insert into public.profiles(id,full_name,role) select id,case when email='pastor@example.org' then 'Fictional pastor' when email='learner@example.org' then 'Fictional learner' when email='reviewer@example.org' then 'Fictional reviewer' else 'Fictional worker' end,case when email='pastor@example.org' then 'pastor' else 'leader' end from auth.users;
