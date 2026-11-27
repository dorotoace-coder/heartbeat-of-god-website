begin;
create table marriages_private.people (
 id uuid primary key default gen_random_uuid(),request_key uuid not null default gen_random_uuid() unique,auth_user_id uuid unique references auth.users(id),member_person_id uuid unique,
 body jsonb not null default '{}',version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table marriages_private.case_people (
 case_id uuid not null references public.hm_cases(id),person_id uuid not null references marriages_private.people(id),
 role text not null default 'participant' check(role in ('participant','family','representative','other')),
 linked_by uuid references auth.users(id),linked_at timestamptz not null default now(),primary key(case_id,person_id)
);
create table marriages_private.person_revisions (
 person_id uuid not null references marriages_private.people(id),version integer not null,body jsonb not null,
 actor uuid not null references auth.users(id),recorded_at timestamptz not null default now(),primary key(person_id,version)
);
create table marriages_private.enquiries (
 id uuid primary key default gen_random_uuid(),request_key uuid not null unique,requester uuid not null references auth.users(id),
 preferred_name text not null,lane text not null check(lane in ('premarital','enrichment','personal','crisis')),
 reply_method text not null,safe_contact text not null default '',language text not null default '',notice_version text not null,
 state text not null default 'received' check(state in ('received','accepted','withdrawn')),
 case_id uuid references public.hm_cases(id),handled_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table marriages_private.enquiry_events(id bigint generated always as identity primary key,enquiry_id uuid not null references marriages_private.enquiries(id),actor uuid not null references auth.users(id),operation text not null,occurred_at timestamptz not null default now());
create unique index hm_one_pending_enquiry on marriages_private.enquiries(requester) where state='received';
do $$ declare t text;begin foreach t in array array['people','case_people','person_revisions','enquiries','enquiry_events'] loop
 execute format('alter table marriages_private.%I enable row level security',t);execute format('revoke all on marriages_private.%I from public,anon,authenticated',t);
end loop;end $$;

create function marriages_private.person_allowed(target uuid,person uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select from marriages_private.case_people c where c.case_id=target and c.person_id=person)
 and (marriages_private.has_scope(target,array['counsellor','records']) or
 (marriages_private.has_scope(target,array['participant']) and exists(select from marriages_private.people p where p.id=person and p.auth_user_id=auth.uid())));
$$;
revoke all on function marriages_private.person_allowed(uuid,uuid) from public,anon,authenticated;
create function marriages_private.hm_people_list(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['counsellor','records','participant']) then raise exception 'Restricted' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'version',p.version,'auth_linked',p.auth_user_id is not null,'member_linked',p.member_person_id is not null,'role',c.role,'body',
 case when marriages_private.has_scope(target,array['counsellor']) or p.auth_user_id=auth.uid() then p.body
 else jsonb_build_object('preferred_name',p.body->>'preferred_name','legal_name',p.body->>'legal_name','date_of_birth',p.body->>'date_of_birth','nationality',p.body->>'nationality','address',p.body->>'address','residence_country',p.body->>'residence_country') end) order by p.created_at),'[]'::jsonb) into result
 from marriages_private.people p join marriages_private.case_people c on c.person_id=p.id where c.case_id=target and marriages_private.person_allowed(target,p.id);
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'people','read');return result;
end; $$;
create function marriages_private.hm_person_save(target uuid,person uuid,expected_version integer,body jsonb,request_key uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result marriages_private.people;key text;value jsonb;
begin
 if person is null then
 if not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501';end if;
 elsif not marriages_private.person_allowed(target,person) or (not marriages_private.has_scope(target,array['counsellor']) and not exists(select from marriages_private.people p where p.id=person and p.auth_user_id=auth.uid())) then raise exception 'Restricted' using errcode='42501';end if;
 if jsonb_typeof(body)<>'object' or octet_length(body::text)>16384 then raise exception 'Invalid person record';end if;
 for key,value in select * from jsonb_each(body) loop
  if key not in ('preferred_name','legal_name','date_of_birth','phone','address','nationality','residence_country','language','accessibility','occupation','dependants_summary') or jsonb_typeof(value)<>'string' or length(value::text)>2000 then raise exception 'Unsupported person field';end if;
 end loop;
 if length(trim(coalesce(body->>'preferred_name','')))=0 then raise exception 'Preferred name required';end if;
 if length(coalesce(body->>'date_of_birth',''))>0 then
 if body->>'date_of_birth'!~'^\d{4}-\d{2}-\d{2}$' or (body->>'date_of_birth')::date>current_date then raise exception 'Valid birth date required';end if;end if;
 if person is null then
 insert into marriages_private.people(body,request_key) values(body,coalesce(request_key,gen_random_uuid())) on conflict on constraint people_request_key_key do nothing returning * into result;
 if result.id is null then
 select * into result from marriages_private.people p where p.request_key=hm_person_save.request_key;
 if result.body is distinct from body or not exists(select from marriages_private.case_people c where c.case_id=target and c.person_id=result.id and c.linked_by=auth.uid()) then raise exception 'Request changed' using errcode='PT409';end if;
 return jsonb_build_object('id',result.id,'version',result.version,'body',result.body);
 end if;
 insert into marriages_private.case_people(case_id,person_id,linked_by) values(target,result.id,auth.uid());
 else update marriages_private.people p set body=hm_person_save.body,version=p.version+1,updated_at=now() where p.id=person and p.version=expected_version returning * into result;
 if result.id is null then raise exception 'Person changed; reopen before saving' using errcode='PT409';end if;end if;
 insert into marriages_private.person_revisions(person_id,version,body,actor) values(result.id,result.version,result.body,auth.uid());
 insert into marriages_private.audit(case_id,actor,object_name,operation,object_id) values(target,auth.uid(),'person','save',result.id);
 return jsonb_build_object('id',result.id,'version',result.version,'body',result.body);
end; $$;
create function marriages_private.hm_person_link_account(target uuid,person uuid,account uuid,identity_checked boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not marriages_private.has_scope(target,array['counsellor']) or not identity_checked or not marriages_private.person_allowed(target,person) then raise exception 'Restricted' using errcode='42501';end if;
 if not exists(select from marriages_private.assignments where case_id=target and user_id=account and scope='participant') then raise exception 'Reviewed participant assignment required';end if;
 update marriages_private.people set auth_user_id=account where id=person and (auth_user_id is null or auth_user_id=account);
 if not found then raise exception 'Person already linked to a different account';end if;
 insert into marriages_private.audit(case_id,actor,object_name,operation,object_id) values(target,auth.uid(),'person_account','link',person);
end; $$;
create function marriages_private.hm_person_reuse(target uuid,source_case uuid,person uuid,identity_checked boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not identity_checked or not marriages_private.has_scope(target,array['counsellor']) or not marriages_private.has_scope(source_case,array['counsellor']) or not exists(select from marriages_private.case_people where case_id=source_case and person_id=person) then raise exception 'Restricted' using errcode='42501';end if;
 insert into marriages_private.case_people(case_id,person_id,linked_by) values(target,person,auth.uid()) on conflict do nothing;
 insert into marriages_private.audit(case_id,actor,object_name,operation,object_id) values(target,auth.uid(),'person','reuse',person);
end; $$;
create function marriages_private.hm_member_candidate(target uuid,person uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare account uuid;candidate uuid;
begin
 if not marriages_private.has_scope(target,array['counsellor']) or not marriages_private.person_allowed(target,person) then raise exception 'Restricted' using errcode='42501';end if;
 select auth_user_id into account from marriages_private.people where id=person;
 if account is null or to_regclass('public.member_profile_intake') is null then return null;end if;
 execute 'select person_id from public.member_profile_intake where user_id=$1 and reviewed_at is not null' into candidate using account;
 return candidate;
end; $$;
create function marriages_private.hm_person_link_member(target uuid,person uuid,member uuid,identity_checked boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not identity_checked or member is null or marriages_private.hm_member_candidate(target,person) is distinct from member then raise exception 'Reviewed membership identity required' using errcode='42501';end if;
 update marriages_private.people set member_person_id=member where id=person and (member_person_id is null or member_person_id=member);
 if not found then raise exception 'Conflicting membership link requires review';end if;
 insert into marriages_private.audit(case_id,actor,object_name,operation,object_id) values(target,auth.uid(),'member_link','review',person);
end; $$;
create function marriages_private.hm_person_history(target uuid,person uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['counsellor']) or not marriages_private.person_allowed(target,person) then raise exception 'Restricted' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by version desc),'[]'::jsonb) into result from marriages_private.person_revisions r where person_id=person;
 insert into marriages_private.audit(case_id,actor,object_name,operation,object_id) values(target,auth.uid(),'person_history','read',person);return result;
end; $$;

create function marriages_private.hm_submit_enquiry(name text,care_lane text,reply text,safe_contact text,language text,notice text,acknowledged boolean,request_key uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare result marriages_private.enquiries;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 if acknowledged is distinct from true or notice is distinct from 'hm-privacy-v1' or request_key is null or length(trim(coalesce(name,'')))=0 or length(name)>150 or length(trim(coalesce(reply,'')))=0 or length(reply)>250 or length(safe_contact)>1000 or length(language)>150 then raise exception 'Name, safe reply method and privacy acknowledgement required';end if;
 insert into marriages_private.enquiries(request_key,requester,preferred_name,lane,reply_method,safe_contact,language,notice_version) values(request_key,auth.uid(),trim(name),care_lane,trim(reply),safe_contact,language,notice) on conflict on constraint enquiries_request_key_key do nothing returning * into result;
 if result.id is null then
 select * into result from marriages_private.enquiries e where e.request_key=hm_submit_enquiry.request_key;
 if result.requester is distinct from auth.uid() or result.preferred_name is distinct from trim(name) or result.lane is distinct from care_lane or result.reply_method is distinct from trim(reply) or result.safe_contact is distinct from safe_contact or result.language is distinct from language then raise exception 'Request changed' using errcode='PT409';end if;end if;
 insert into marriages_private.enquiry_events(enquiry_id,actor,operation) values(result.id,auth.uid(),'submit_or_retry');
 return result.id;
end; $$;
create function marriages_private.hm_my_enquiries() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'preferred_name',preferred_name,'lane',lane,'state',state,'created_at',created_at,'case_id',case_id) order by created_at desc),'[]'::jsonb) from marriages_private.enquiries where requester=auth.uid() and auth.uid() is not null;
$$;
create function marriages_private.hm_triage_queue() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.hm_can_create() then raise exception 'Restricted' using errcode='42501';end if;
 insert into marriages_private.enquiry_events(enquiry_id,actor,operation) select id,auth.uid(),'triage_read' from marriages_private.enquiries where state='received';
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'preferred_name',preferred_name,'lane',lane,'language',language,'created_at',created_at) order by created_at),'[]'::jsonb) into result from marriages_private.enquiries where state='received';
 return result;
end; $$;
create function marriages_private.hm_accept_enquiry(enquiry_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare request marriages_private.enquiries;target uuid;person uuid;
begin
 if not marriages_private.hm_can_create() then raise exception 'Restricted' using errcode='42501';end if;
 select * into request from marriages_private.enquiries where id=enquiry_id for update;
 if request.id is null or request.state='withdrawn' then raise exception 'Enquiry unavailable';end if;
 if request.state='accepted' then if marriages_private.has_scope(request.case_id,array['counsellor']) then return request.case_id;else raise exception 'Enquiry already assigned' using errcode='PT409';end if;end if;
 target:=marriages_private.hm_create_case(request.preferred_name,request.lane);
 update public.hm_cases set status='triaged',next_action='Review the requested safe reply preferences',none_reason='',version=version+1 where id=target;
 insert into marriages_private.case_revisions(case_id,version,body,actor) select id,version,to_jsonb(c),auth.uid() from public.hm_cases c where id=target;
 insert into marriages_private.assignments values(target,request.requester,'participant');
 select id into person from marriages_private.people where auth_user_id=request.requester for update;
 if person is null then
 insert into marriages_private.people(auth_user_id,body) values(request.requester,jsonb_build_object('preferred_name',request.preferred_name,'language',request.language)) returning id into person;
 insert into marriages_private.person_revisions(person_id,version,body,actor) select id,version,body,auth.uid() from marriages_private.people where id=person;
 end if;
 insert into marriages_private.case_people(case_id,person_id,linked_by) values(target,person,auth.uid());
 perform marriages_private.hm_journey_save(target,null,'intake',null,jsonb_build_object('title','Care enquiry','status','active','preferred_name',request.preferred_name,'contact_method',request.reply_method,'safe_contact',request.safe_contact,'language',request.language,'notice_version',request.notice_version,'acknowledged',true,'person_id',person::text));
 insert into marriages_private.enquiry_events(enquiry_id,actor,operation) values(request.id,auth.uid(),'accept');
 update marriages_private.enquiries set state='accepted',case_id=target,handled_by=auth.uid() where id=enquiry_id;
 insert into marriages_private.audit(case_id,actor,object_name,operation,object_id) values(target,auth.uid(),'enquiry','accept',request.id);
 return target;
end; $$;
create function marriages_private.hm_withdraw_enquiry(enquiry_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update marriages_private.enquiries set state='withdrawn' where id=enquiry_id and requester=auth.uid() and state='received';
 if not found then raise exception 'Only your pending enquiry can be withdrawn';end if;
 insert into marriages_private.enquiry_events(enquiry_id,actor,operation) values(enquiry_id,auth.uid(),'withdraw');
end; $$;

create or replace function marriages_private.entry_valid(kind text,body jsonb) returns void language plpgsql set search_path='' as $$
declare allowed text[];key text;value text;
begin
 if jsonb_typeof(body)<>'object' or octet_length(body::text)>32768 then raise exception 'Invalid entry'; end if;
 allowed:=array['title','person_reference','person_id','status','date','time','timezone','private_note','public_summary','released','next_action','next_date'];
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

create or replace function marriages_private.hm_journey_list(target uuid,event_kind text) returns jsonb
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
create or replace function marriages_private.hm_journey_save(target uuid,entry_id uuid,event_kind text,expected_version integer,body jsonb,request_key uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result marriages_private.journey_entries;
begin
 if not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 perform marriages_private.entry_valid(event_kind,body);
 if length(coalesce(body->>'person_id',''))>0 and not exists(select from marriages_private.case_people where case_id=target and person_id=(body->>'person_id')::uuid) then raise exception 'Person is not linked to this case';end if;
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

create or replace function marriages_private.registry_item_valid(kind text,body jsonb) returns void language plpgsql set search_path='' as $$
declare allowed text[];key text;value jsonb;
begin
 if kind not in ('document','authority','submission','certificate') or jsonb_typeof(body)<>'object' or octet_length(body::text)>16384 then raise exception 'Invalid registry evidence';end if;
 allowed:=array['title','person_reference','person_id','status','reference','issuer','date','reviewed_on','expires_on','source','reason','required'];
 allowed:=allowed||case kind when 'document' then array['document_type'] when 'authority' then array['authority_type','jurisdiction'] when 'submission' then array['stage','official_channel','submitted_on','due_on','deadline_source','acknowledgement','acknowledged_on'] else array['certificate_type','verification_reference','supersedes_reference'] end;
 for key,value in select * from jsonb_each(body) loop
  if not key=any(allowed) or length(value::text)>2000 then raise exception 'Unsupported registry evidence field';end if;
  if key='required' then if jsonb_typeof(value)<>'boolean' then raise exception 'Boolean required';end if;
  elsif jsonb_typeof(value)<>'string' then raise exception 'Text required';end if;
 end loop;
 if length(trim(coalesce(body->>'title','')))=0 then raise exception 'Evidence title required';end if;
 if coalesce(body->>'status','') not in ('pending','received','reviewed','rejected','expired','prepared','submitted','acknowledged','correction_requested','unverified','verified','superseded','cancelled') then raise exception 'Evidence status required';end if;
 foreach key in array array['date','reviewed_on','expires_on','submitted_on','due_on','acknowledged_on'] loop
  if length(coalesce(body->>key,''))>0 then if body->>key!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'ISO date required';end if;perform (body->>key)::date;end if;
 end loop;
 if body->>'status' in ('reviewed','verified','acknowledged') and (length(trim(coalesce(body->>'reference','')))=0 or length(trim(coalesce(body->>'source','')))=0 or length(coalesce(body->>'reviewed_on',''))=0) then raise exception 'Reviewed reference, source and date required';end if;
 if kind='submission' and body->>'status' in ('submitted','acknowledged','correction_requested','rejected') and (length(trim(coalesce(body->>'reference','')))=0 or length(trim(coalesce(body->>'official_channel','')))=0 or length(coalesce(body->>'submitted_on',''))=0) then raise exception 'Submission reference, channel and date required';end if;
 if kind='submission' and body->>'status'='acknowledged' and length(trim(coalesce(body->>'acknowledgement','')))=0 then raise exception 'Acknowledgement reference required';end if;
 if length(coalesce(body->>'due_on',''))>0 and length(trim(coalesce(body->>'deadline_source','')))=0 then raise exception 'Confirm the deadline source';end if;
 if body->>'status' in ('rejected','correction_requested','superseded','cancelled') and length(trim(coalesce(body->>'reason','')))=0 then raise exception 'Review or correction reason required';end if;
 if kind='certificate' and body->>'certificate_type' in ('replacement','amendment') and length(trim(coalesce(body->>'supersedes_reference','')))=0 then raise exception 'Earlier certificate reference required';end if;
 if kind='certificate' and (coalesce(body->>'certificate_type','') not in ('official_marriage','church_commemorative','certified_copy','replacement','amendment') or (body->>'status'='verified' and length(trim(coalesce(body->>'verification_reference','')))=0)) then raise exception 'Certificate type and verified evidence required';end if;
end; $$;
revoke all on function marriages_private.registry_item_valid(text,jsonb) from public,anon,authenticated;

create or replace function marriages_private.hm_registry_items(target uuid,item_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['counsellor','records']) then raise exception 'Restricted' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) into result from marriages_private.registry_items r where r.case_id=target and r.kind=item_kind;
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'registry_items','read');return result;
end; $$;
create or replace function marriages_private.hm_registry_item_save(target uuid,item_id uuid,item_kind text,expected_version integer,body jsonb,request_key uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result marriages_private.registry_items;
begin
 if not marriages_private.has_scope(target,array['counsellor','records']) then raise exception 'Restricted' using errcode='42501';end if;
 perform marriages_private.registry_item_valid(item_kind,body);
 if length(coalesce(body->>'person_id',''))>0 and not exists(select from marriages_private.case_people where case_id=target and person_id=(body->>'person_id')::uuid) then raise exception 'Person is not linked to this case';end if;
 if item_id is null then
  insert into marriages_private.registry_items(case_id,kind,body,request_key,created_by,updated_by) values(target,item_kind,body,coalesce(request_key,gen_random_uuid()),auth.uid(),auth.uid()) on conflict on constraint registry_items_request_key_key do nothing returning * into result;
  if result.id is null then
   select * into result from marriages_private.registry_items r where r.request_key=hm_registry_item_save.request_key;
   if result.case_id is distinct from target or result.kind is distinct from item_kind or result.body is distinct from body or result.created_by is distinct from auth.uid() then raise exception 'Request changed' using errcode='PT409';end if;
   return to_jsonb(result);
  end if;
 else
  update marriages_private.registry_items r set body=hm_registry_item_save.body,version=r.version+1,updated_by=auth.uid(),updated_at=now() where r.id=item_id and r.case_id=target and r.kind=item_kind and r.version=expected_version returning * into result;
  if result.id is null then raise exception 'Evidence changed; reopen before saving' using errcode='PT409';end if;
 end if;
 insert into marriages_private.registry_item_revisions(item_id,version,body,actor) values(result.id,result.version,result.body,auth.uid());
 insert into marriages_private.audit(case_id,actor,object_name,operation,object_id) values(target,auth.uid(),'registry_'||item_kind,'save',result.id);
 return to_jsonb(result);
end; $$;
create or replace function marriages_private.hm_export_own(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['participant']) then raise exception 'Restricted' using errcode='42501';end if;
 select jsonb_build_object('case_id',target,'exported_at',now(),
 'answers',coalesce((select jsonb_agg(to_jsonb(r)) from public.hm_answers r where r.case_id=target and r.author_id=auth.uid()),'[]'::jsonb),
 'consent_history',coalesce((select jsonb_agg(to_jsonb(e)) from marriages_private.consent_events e where e.case_id=target and e.person_id=auth.uid()),'[]'::jsonb),
 'requests',coalesce((select jsonb_agg(to_jsonb(q)) from marriages_private.rights_requests q where q.case_id=target and q.person_id=auth.uid()),'[]'::jsonb),
 'person_profile',(select jsonb_build_object('id',p.id,'body',p.body,'version',p.version) from marriages_private.people p where p.auth_user_id=auth.uid()),
 'my_enquiries',coalesce((select jsonb_agg(to_jsonb(e)-'request_key') from marriages_private.enquiries e where e.requester=auth.uid()),'[]'::jsonb)) into result;
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'own_records','export');return result;
end; $$;

create or replace function marriages_private.hm_save_answer(target uuid,key text,body text,share text,expected_version integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['participant']) or not marriages_private.consented(target,auth.uid(),'care') then raise exception 'Participant consent required' using errcode='42501'; end if;
 if not exists(select from public.hm_cases where id=target and lane='premarital') then raise exception 'RTT is only available in the premarital lane';end if;
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



-- Exposed functions are invoker wrappers; privileged implementations remain private.
do $$ declare f record;names text;begin
 for f in select p.proname,p.oid::regprocedure signature,pg_get_function_arguments(p.oid) arguments,pg_get_function_result(p.oid) result,p.proargnames,p.pronargs from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='marriages_private' and p.proname in ('hm_people_list','hm_person_save','hm_person_link_account','hm_person_reuse','hm_member_candidate','hm_person_link_member','hm_person_history','hm_submit_enquiry','hm_my_enquiries','hm_triage_queue','hm_accept_enquiry','hm_withdraw_enquiry') loop
 select string_agg(quote_ident(arg),',') into names from unnest(f.proargnames[1:f.pronargs]) arg;
 execute format('create function public.%I(%s) returns %s language sql security invoker set search_path='''' as %L',f.proname,f.arguments,f.result,format('select * from marriages_private.%I(%s)',f.proname,coalesce(names,'')));
 execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('hm_people_list','hm_person_save','hm_person_link_account','hm_person_reuse','hm_member_candidate','hm_person_link_member','hm_person_history','hm_submit_enquiry','hm_my_enquiries','hm_triage_queue','hm_accept_enquiry','hm_withdraw_enquiry') loop
 execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
