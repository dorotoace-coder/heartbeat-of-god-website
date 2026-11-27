-- Dormant until explicitly provisioned. No automatic staff grants or existing data imports.
begin;
create schema if not exists marriages_private;
revoke all on schema marriages_private from public, anon;
grant usage on schema marriages_private to authenticated;
create table marriages_private.staff (
 user_id uuid primary key references auth.users(id), can_create boolean not null default false
);
create table public.hm_cases (
 id uuid primary key default gen_random_uuid(), display_name text not null check(length(display_name) between 1 and 150),
 lane text not null check(lane in ('premarital','enrichment','personal')), created_at timestamptz not null default now()
);
create table marriages_private.assignments (
 case_id uuid not null references public.hm_cases(id), user_id uuid not null references auth.users(id),
 scope text not null check(scope in ('counsellor','records','coordinator','participant')),
 primary key(case_id,user_id,scope)
);
-- No API grants on staff/assignments. Only an authorised operator may provision or revoke access.
revoke all on all tables in schema marriages_private from public,anon,authenticated;
alter table marriages_private.staff enable row level security;
alter table marriages_private.assignments enable row level security;
create function marriages_private.has_scope(target uuid, scopes text[]) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from marriages_private.assignments a
 where a.case_id=target and a.user_id=auth.uid() and a.scope=any(scopes));
$$;
create index hm_assignments_user on marriages_private.assignments(user_id,case_id);
revoke all on function marriages_private.has_scope(uuid,text[]) from public,anon;
grant execute on function marriages_private.has_scope(uuid,text[]) to authenticated;

create table public.hm_care (
 case_id uuid primary key references public.hm_cases(id), payload jsonb not null default '{}',
 version integer not null default 1, updated_at timestamptz not null default now(),
 check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=65536)
);
create table public.hm_registry (
 case_id uuid primary key references public.hm_cases(id), payload jsonb not null default '{}',
 version integer not null default 1, updated_at timestamptz not null default now(),
 check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=32768)
);
create table public.hm_logistics (
 case_id uuid primary key references public.hm_cases(id), payload jsonb not null default '{}',
 version integer not null default 1, updated_at timestamptz not null default now(),
 check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=16384)
);
create table public.hm_answers (
 case_id uuid not null references public.hm_cases(id), author_id uuid not null references auth.users(id),
 question_key text not null check(question_key in ('meaning_1','meaning_2','meaning_3','family_1','family_2','family_3','family_4','money_1','money_2','money_3','money_4','home_1','home_2','home_3','home_4','balance_1','balance_2','balance_3','balance_4','balance_5','balance_6','decision_1','decision_2','decision_3','decision_4','foundation_1','foundation_2','foundation_3','forgiveness_1','forgiveness_2','forgiveness_3','career_1','career_2','career_3')),
 question_version text not null default 'rtt-local-v1' check(question_version='rtt-local-v1'),
 answer text not null check(length(answer)<=2000), visibility text not null default 'sealed' check(visibility in ('sealed','shared')),
 version integer not null default 1, updated_at timestamptz not null default now(),
 primary key(case_id,author_id,question_key)
);
create table marriages_private.audit (
 id bigint generated always as identity primary key, case_id uuid not null, actor uuid,
 object_name text not null, operation text not null, occurred_at timestamptz not null default now()
);
alter table marriages_private.audit enable row level security;
revoke all on marriages_private.audit from public,anon,authenticated;
create function marriages_private.record_write() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into marriages_private.audit(case_id,actor,object_name,operation)
 values(new.case_id,auth.uid(),tg_table_name,tg_op);
 return new;
end; $$;
revoke all on function marriages_private.record_write() from public,anon,authenticated;
create function marriages_private.advance_version() returns trigger language plpgsql set search_path='' as $$
begin
 if new.case_id<>old.case_id then raise exception 'Record identity is immutable'; end if;
 if new.version<>old.version then raise exception 'Version is server controlled'; end if;
 if tg_table_name='hm_answers' then
  if new.author_id<>old.author_id or new.question_key<>old.question_key then raise exception 'Answer identity is immutable'; end if;
 end if;
 new.version:=old.version+1; new.updated_at:=now(); return new;
end; $$;
revoke all on function marriages_private.advance_version() from public,anon,authenticated;

alter table public.hm_cases enable row level security;
create policy hm_cases_read on public.hm_cases for select to authenticated
 using(marriages_private.has_scope(id,array['counsellor','records','coordinator','participant']));
revoke all on public.hm_cases from public,anon,authenticated;
grant select on public.hm_cases to authenticated;

do $$ declare t text; scopes text[]; begin
 foreach t in array array['hm_care','hm_registry','hm_logistics'] loop
  scopes:=case t when 'hm_care' then array['counsellor'] when 'hm_registry' then array['counsellor','records'] else array['counsellor','coordinator'] end;
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('grant update(payload) on public.%I to authenticated',t);
  execute format('create policy scoped_read on public.%I for select to authenticated using(marriages_private.has_scope(case_id,%L::text[]))',t,scopes);
  execute format('create policy scoped_update on public.%I for update to authenticated using(marriages_private.has_scope(case_id,%L::text[])) with check(marriages_private.has_scope(case_id,%L::text[]))',t,scopes,scopes);
  execute format('create trigger advance_version before update on public.%I for each row execute function marriages_private.advance_version()',t);
  execute format('create trigger audit_write after insert or update on public.%I for each row execute function marriages_private.record_write()',t);
 end loop;
end $$;

alter table public.hm_answers enable row level security;
revoke all on public.hm_answers from public,anon,authenticated;
grant select on public.hm_answers to authenticated;
grant insert(case_id,author_id,question_key,answer,visibility) on public.hm_answers to authenticated;
grant update(answer,visibility) on public.hm_answers to authenticated;
create policy answers_read on public.hm_answers for select to authenticated using(
 marriages_private.has_scope(case_id,array['counsellor']) or
 (marriages_private.has_scope(case_id,array['participant']) and (author_id=auth.uid() or visibility='shared'))
);
create policy answers_insert on public.hm_answers for insert to authenticated with check(
 author_id=auth.uid() and marriages_private.has_scope(case_id,array['participant'])
);
create policy answers_update on public.hm_answers for update to authenticated
 using(author_id=auth.uid() and marriages_private.has_scope(case_id,array['participant']))
 with check(author_id=auth.uid() and marriages_private.has_scope(case_id,array['participant']));
create trigger answer_version before update on public.hm_answers for each row execute function marriages_private.advance_version();
create trigger answer_audit after insert or update on public.hm_answers for each row execute function marriages_private.record_write();

create function public.hm_create_case(case_name text,case_lane text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null or not exists(select 1 from marriages_private.staff where user_id=auth.uid() and can_create) then
 raise exception 'Case creation is restricted' using errcode='42501'; end if;
 insert into public.hm_cases(display_name,lane) values(trim(case_name),case_lane) returning id into result;
 insert into marriages_private.assignments values(result,auth.uid(),'counsellor');
 insert into public.hm_care(case_id) values(result);
 insert into public.hm_registry(case_id) values(result);
 insert into public.hm_logistics(case_id) values(result);
 return result;
end; $$;
revoke all on function public.hm_create_case(text,text) from public,anon;
grant execute on function public.hm_create_case(text,text) to authenticated;
create function public.hm_my_access() returns table(case_id uuid,scope text)
language sql stable security definer set search_path='' as $$
 select a.case_id,a.scope from marriages_private.assignments a where a.user_id=auth.uid() and auth.uid() is not null;
$$;
revoke all on function public.hm_my_access() from public,anon;
grant execute on function public.hm_my_access() to authenticated;

create function marriages_private.validate_payload() returns trigger language plpgsql set search_path='' as $$
declare allowed text[]; key text;
begin
 allowed:=case tg_table_name
 when 'hm_care' then array['background','wellbeing','preparation','family_visits','session_notes','consent_version']
 when 'hm_registry' then array['kind','country','region','venue','date','actualDate','officiant','witnesses','authority','eligibility','evidence','receipt','acknowledgement','status']
 else array['next_date','timezone','channel','safe_contact','followup_permission','appointment_status'] end;
 for key in select jsonb_object_keys(new.payload) loop
  if not key=any(allowed) then raise exception 'Unsupported field'; end if;
 end loop;
 if tg_table_name='hm_registry' and coalesce(new.payload->>'status','Planning') not in ('Planning','Ceremony recorded','Return submitted','Verified') then raise exception 'Invalid registry status'; end if;
 if tg_table_name='hm_registry' and coalesce(new.payload->>'status','Planning')<>'Planning' then
  if new.payload->'authority' is distinct from 'true'::jsonb or new.payload->'eligibility' is distinct from 'true'::jsonb then raise exception 'Reviewed authority and eligibility are required'; end if;
  foreach key in array array['actualDate','country','region','venue','officiant','witnesses','evidence'] loop
   if length(trim(coalesce(new.payload->>key,'')))=0 then raise exception 'Ceremony evidence is incomplete'; end if;
  end loop;
  if new.payload->>'status' in ('Return submitted','Verified') and length(trim(coalesce(new.payload->>'receipt','')))=0 then raise exception 'Submission receipt required'; end if;
  if new.payload->>'status'='Verified' and length(trim(coalesce(new.payload->>'acknowledgement','')))=0 then raise exception 'Official acknowledgement required'; end if;
 end if;
 if tg_table_name='hm_logistics' and length(coalesce(new.payload->>'next_date',''))>0 and new.payload->'followup_permission' is distinct from 'true'::jsonb then raise exception 'Follow-up permission required'; end if;
 return new;
end; $$;
revoke all on function marriages_private.validate_payload() from public,anon,authenticated;
create trigger validate_care before insert or update on public.hm_care for each row execute function marriages_private.validate_payload();
create trigger validate_registry before insert or update on public.hm_registry for each row execute function marriages_private.validate_payload();
create trigger validate_logistics before insert or update on public.hm_logistics for each row execute function marriages_private.validate_payload();

-- Production access remains empty. No mapping from existing ministry roles is implied.
commit;
