begin;
alter table public.hm_cases add column status text not null default 'received' check(status in ('received','triaged','active','waiting','closed'));
alter table public.hm_cases add column track text not null default 'discernment' check(track in ('discernment','preparation'));
alter table public.hm_cases add column next_action text not null default '';
alter table public.hm_cases add column next_due date;
alter table public.hm_cases add column none_reason text not null default 'Not yet reviewed';
alter table public.hm_cases add column version integer not null default 1;
alter table public.hm_cases drop constraint hm_cases_lane_check;
alter table public.hm_cases add constraint hm_cases_lane_check check(lane in ('premarital','enrichment','personal','crisis'));
alter table marriages_private.audit add column object_id uuid;

create table marriages_private.journey_entries (
 id uuid primary key default gen_random_uuid(), request_key uuid not null default gen_random_uuid() unique, case_id uuid not null references public.hm_cases(id),
 kind text not null check(kind in ('intake','family_visit','prior_union','session','preparation','referral','cultural','aftercare','pastoral_review')),
 body jsonb not null check(jsonb_typeof(body)='object' and octet_length(body::text)<=32768),
 version integer not null default 1, created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id), created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index hm_entries_case on marriages_private.journey_entries(case_id,kind,created_at);
create table marriages_private.journey_revisions (
 entry_id uuid not null references marriages_private.journey_entries(id),version integer not null,
 body jsonb not null, actor uuid not null references auth.users(id),recorded_at timestamptz not null default now(),
 primary key(entry_id,version)
);
create table marriages_private.case_revisions (
 case_id uuid not null references public.hm_cases(id),version integer not null,body jsonb not null,
 actor uuid not null references auth.users(id),recorded_at timestamptz not null default now(),primary key(case_id,version)
);
alter table marriages_private.journey_entries enable row level security;
alter table marriages_private.journey_revisions enable row level security;
alter table marriages_private.case_revisions enable row level security;
revoke all on marriages_private.journey_entries,marriages_private.journey_revisions,marriages_private.case_revisions from public,anon,authenticated;

create function marriages_private.entry_valid(kind text,body jsonb) returns void language plpgsql set search_path='' as $$
declare allowed text[];key text;value text;
begin
 if jsonb_typeof(body)<>'object' or octet_length(body::text)>32768 then raise exception 'Invalid entry'; end if;
 allowed:=array['title','person_reference','status','date','time','timezone','private_note','public_summary','released','next_action','next_date'];
 allowed:=allowed||case kind
 when 'intake' then array['preferred_name','contact_method','safe_contact','language','accessibility','notice_version','acknowledged','source','relationship_context']
 when 'family_visit' then array['visit_type','venue','attendees','permission','outcome']
 when 'prior_union' then array['union_type','union_status','jurisdiction','end_date','same_partner','evidence_status','evidence_reference']
 when 'session' then array['session_type','channel','attendees','arrangements_checked','attendance','agreed_actions']
 when 'preparation' then array['milestone','evidence_reference','review_reason']
 when 'referral' then array['purpose','permission','provider_reference']
 when 'cultural' then array['custom','couple_selected','outcome','budget_note']
 when 'aftercare' then array['channel','permission','focus']
 when 'pastoral_review' then array['outcome','review_reason'] else null end;
 if kind not in ('intake','family_visit','prior_union','session','preparation','referral','cultural','aftercare','pastoral_review') then raise exception 'Invalid entry kind'; end if;
 for key,value in select k,v::text from jsonb_each(body) x(k,v) loop
  if not key=any(allowed) or length(value)>6500 then raise exception 'Unsupported or oversized field'; end if;
  if key in ('permission','same_partner','arrangements_checked','couple_selected','released','acknowledged') then
   if jsonb_typeof(body->key)<>'boolean' then raise exception 'Boolean field required'; end if;
  elsif jsonb_typeof(body->key)<>'string' then raise exception 'Text field required'; end if;
 end loop;
 if length(trim(coalesce(body->>'title','')))=0 then raise exception 'Entry title required'; end if;
 if coalesce(body->>'status','') not in ('draft','planned','active','completed','cancelled','postponed','no_show','reviewed','waived','not_applicable','closed') then raise exception 'Entry status required'; end if;
 foreach key in array array['date','end_date','next_date'] loop
  value:=body->>key;
  if length(coalesce(value,''))>0 then
   if value!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'Use an ISO date'; end if;
   perform value::date;
  end if;
 end loop;
 if length(coalesce(body->>'time',''))>0 then
  if body->>'time'!~'^\d{2}:\d{2}$' then raise exception 'Use a local time'; end if;
  perform (body->>'time')::time;
 end if;
 if kind in ('family_visit','session','aftercare') and body->>'status' in ('planned','completed','no_show') then
  if length(coalesce(body->>'date',''))=0 or not exists(select from pg_catalog.pg_timezone_names where name=body->>'timezone') then raise exception 'Date and valid timezone required'; end if;
 end if;
 if kind='intake' and (length(trim(coalesce(body->>'preferred_name','')))=0 or length(trim(coalesce(body->>'contact_method','')))=0 or body->'acknowledged' is distinct from 'true'::jsonb or body->>'notice_version' is distinct from 'hm-privacy-v1') then raise exception 'Intake name, safe reply method and notice acknowledgement required'; end if;
 if kind in ('family_visit','referral','aftercare') and body->>'status' not in ('draft','cancelled','closed') and body->'permission' is distinct from 'true'::jsonb then raise exception 'Contact or referral permission required'; end if;
 if kind='family_visit' and coalesce(body->>'visit_type','') not in ('introduction','family_home','remote','followup') then raise exception 'Visit type required'; end if;
 if kind='session' and coalesce(body->>'session_type','') not in ('individual','joint') then raise exception 'Session type required'; end if;
 if kind='referral' and length(trim(coalesce(body->>'purpose','')))=0 then raise exception 'Referral purpose required'; end if;
 if kind='pastoral_review' and (coalesce(body->>'outcome','') not in ('continue_care','proceed','pause_and_build','not_yet') or length(trim(coalesce(body->>'review_reason','')))=0) then raise exception 'Human outcome and rationale required'; end if;
 if kind='cultural' and body->'couple_selected' is distinct from 'true'::jsonb then raise exception 'Customs must be chosen by the couple'; end if;
 if kind='prior_union' then
  if length(trim(coalesce(body->>'person_reference','')))=0 or coalesce(body->>'union_type','') not in ('customary','religious','statutory','foreign','unknown') or coalesce(body->>'union_status','') not in ('ongoing','separated','divorce_pending','divorced_reported','widowed_reported','annulled_reported','unknown') then raise exception 'Person and reported union history required'; end if;
  if body->>'evidence_status'='reviewed' and length(trim(coalesce(body->>'evidence_reference','')))=0 then raise exception 'Reviewed evidence reference required'; end if;
 end if;
 if kind='session' and body->>'status'='completed' and body->'arrangements_checked' is distinct from 'true'::jsonb then raise exception 'Required session arrangements must be confirmed'; end if;
 if kind='preparation' and body->>'status' in ('reviewed','waived','not_applicable') and length(trim(coalesce(body->>'review_reason','')))=0 then raise exception 'Human review reason required'; end if;
 if body->'released'='true'::jsonb and length(trim(coalesce(body->>'public_summary','')))=0 then raise exception 'Explicit shared summary required'; end if;
 if kind in ('intake','prior_union','referral') and body->'released'='true'::jsonb then raise exception 'This entry remains confidential'; end if;
end; $$;
revoke all on function marriages_private.entry_valid(text,jsonb) from public,anon,authenticated;

create function marriages_private.hm_journey_list(target uuid,event_kind text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;counsellor boolean;coordinator boolean;participant boolean;
begin
 counsellor:=marriages_private.has_scope(target,array['counsellor']);
 coordinator:=marriages_private.has_scope(target,array['coordinator']);
 participant:=marriages_private.has_scope(target,array['participant']);
 if not counsellor and not (coordinator and event_kind in ('session','aftercare')) and not participant then raise exception 'Restricted' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'case_id',e.case_id,'kind',e.kind,'version',e.version,'created_at',e.created_at,'updated_at',e.updated_at,'body',
 case when counsellor then e.body when coordinator and not participant then jsonb_build_object('title',case e.kind when 'session' then 'Appointment' else 'Check-in' end,'date',e.body->>'date','time',e.body->>'time','timezone',e.body->>'timezone','channel',e.body->>'channel','status',e.body->>'status')
 else jsonb_build_object('title',case e.kind when 'family_visit' then 'Family meeting' when 'session' then 'Appointment' when 'pastoral_review' then 'Pastoral review' else 'Care update' end,'date',e.body->>'date','time',e.body->>'time','timezone',e.body->>'timezone','status',e.body->>'status','public_summary',e.body->>'public_summary') end) order by e.created_at desc),'[]'::jsonb) into result
 from marriages_private.journey_entries e where e.case_id=target and e.kind=event_kind and
 (counsellor or (coordinator and not participant and e.kind in ('session','aftercare')) or
 (participant and e.kind not in ('intake','prior_union','referral') and e.body->'released'='true'::jsonb));
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'journey','read');
 return result;
end; $$;
create function marriages_private.hm_journey_save(target uuid,entry_id uuid,event_kind text,expected_version integer,body jsonb,request_key uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result marriages_private.journey_entries;
begin
 if not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 perform marriages_private.entry_valid(event_kind,body);
 if entry_id is null then
  insert into marriages_private.journey_entries(case_id,kind,body,created_by,updated_by,request_key) values(target,event_kind,body,auth.uid(),auth.uid(),coalesce(request_key,gen_random_uuid())) on conflict on constraint journey_entries_request_key_key do nothing returning * into result;
  if result.id is null then
   select * into result from marriages_private.journey_entries e where e.request_key=hm_journey_save.request_key;
   if result.case_id is distinct from target or result.kind is distinct from event_kind or result.created_by is distinct from auth.uid() or result.body is distinct from body then raise exception 'Request changed; reopen before saving' using errcode='PT409'; end if;
   return to_jsonb(result);
  end if;
 else
  update marriages_private.journey_entries e set body=hm_journey_save.body,version=e.version+1,updated_by=auth.uid(),updated_at=now()
  where e.id=entry_id and e.case_id=target and e.kind=event_kind and e.version=expected_version returning * into result;
  if result.id is null then raise exception 'Entry changed; reopen before saving' using errcode='PT409'; end if;
 end if;
 insert into marriages_private.journey_revisions(entry_id,version,body,actor) values(result.id,result.version,result.body,auth.uid());
 insert into marriages_private.audit(case_id,actor,object_name,operation,object_id) values(target,auth.uid(),event_kind,'save',result.id);
 return to_jsonb(result);
end; $$;
create function marriages_private.hm_journey_history(target uuid,entry_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.version desc),'[]'::jsonb) into result from marriages_private.journey_revisions r join marriages_private.journey_entries e on e.id=r.entry_id where e.id=hm_journey_history.entry_id and e.case_id=target;
 insert into marriages_private.audit(case_id,actor,object_name,operation,object_id) values(target,auth.uid(),'journey_history','read',entry_id);
 return result;
end; $$;
create function marriages_private.hm_case_progress(target uuid,expected_version integer,new_status text,new_track text,action text,due date,no_action_reason text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result public.hm_cases;
begin
 if not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 if length(action)>500 or length(no_action_reason)>500 or (length(trim(action))=0 and length(trim(no_action_reason))=0) then raise exception 'Next action or reason required'; end if;
 update public.hm_cases set status=new_status,track=new_track,next_action=action,next_due=due,none_reason=no_action_reason,version=version+1 where id=target and version=expected_version returning * into result;
 if result.id is null then raise exception 'Case changed; reopen before saving' using errcode='PT409'; end if;
 insert into marriages_private.case_revisions(case_id,version,body,actor) values(target,result.version,to_jsonb(result),auth.uid());
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'case_progress','save');
 return to_jsonb(result);
end; $$;

create or replace function marriages_private.hm_list_cases() returns setof public.hm_cases
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into marriages_private.audit(case_id,actor,object_name,operation) select c.id,auth.uid(),'case','read' from public.hm_cases c where marriages_private.has_scope(c.id,array['counsellor','records','coordinator','participant']);
 return query select (jsonb_populate_record(null::public.hm_cases,to_jsonb(c)||case when marriages_private.has_scope(c.id,array['counsellor']) then '{}'::jsonb else jsonb_build_object('next_action','','next_due',null,'none_reason','') end)).*
 from public.hm_cases c where marriages_private.has_scope(c.id,array['counsellor','records','coordinator','participant']) order by c.created_at desc;
end; $$;
create or replace function marriages_private.hm_save_answer(target uuid,key text,body text,share text,expected_version integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['participant']) or not marriages_private.consented(target,auth.uid(),'care') then raise exception 'Participant consent required' using errcode='42501'; end if;
 if share='shared' and not marriages_private.consented(target,auth.uid(),'partner_sharing') then raise exception 'Sharing permission required' using errcode='42501'; end if;
 if key in ('decision_1','decision_2','decision_3') and not exists(select from public.hm_cases where id=target and track='discernment') then raise exception 'Question is not in the current track'; end if;
 if expected_version is null then
 insert into public.hm_answers(case_id,author_id,question_key,answer,visibility) values(target,auth.uid(),key,body,share) returning to_jsonb(hm_answers) into result;
 else
 update public.hm_answers set answer=body,visibility=share where case_id=target and author_id=auth.uid() and question_key=key and version=expected_version returning to_jsonb(hm_answers) into result;
 end if;
 if result is null then raise exception 'Answer changed; reopen before saving' using errcode='PT409'; end if;
 return result;
end; $$;


create function marriages_private.hm_case_people(target uuid) returns table(user_id uuid,label text)
language plpgsql security definer set search_path='' as $$
begin
 if not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 return query select u.id,coalesce(nullif(u.raw_user_meta_data->>'full_name',''),u.email,'Account') from auth.users u where u.id in
 (select a.user_id from marriages_private.assignments a where a.case_id=target and a.scope='participant'
 union select i.claimed_by from marriages_private.invites i where i.case_id=target and i.revoked_at is null and i.claimed_by is not null);
end; $$;
create function marriages_private.hm_can_create() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select from marriages_private.staff where user_id=auth.uid() and can_create) $$;
-- Public endpoints remain invoker wrappers. No direct table access or role promotion.
create function public.hm_can_create() returns boolean language sql security invoker set search_path='' as $$ select marriages_private.hm_can_create() $$;
create function public.hm_case_people(target uuid) returns table(user_id uuid,label text) language sql security invoker set search_path='' as $$ select * from marriages_private.hm_case_people(target) $$;
create function public.hm_journey_list(target uuid,event_kind text) returns jsonb language sql security invoker set search_path='' as $$ select marriages_private.hm_journey_list(target,event_kind) $$;
create function public.hm_journey_save(target uuid,entry_id uuid,event_kind text,expected_version integer,body jsonb,request_key uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select marriages_private.hm_journey_save(target,entry_id,event_kind,expected_version,body,request_key) $$;
create function public.hm_journey_history(target uuid,entry_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select marriages_private.hm_journey_history(target,entry_id) $$;
create function public.hm_case_progress(target uuid,expected_version integer,new_status text,new_track text,action text,due date,no_action_reason text) returns jsonb language sql security invoker set search_path='' as $$ select marriages_private.hm_case_progress(target,expected_version,new_status,new_track,action,due,no_action_reason) $$;
do $$ declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','marriages_private') and p.proname in ('hm_journey_list','hm_journey_save','hm_journey_history','hm_case_progress','hm_case_people','hm_can_create') loop
 execute format('revoke all on function %s from public,anon',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
