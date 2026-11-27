begin;
create table marriages_private.registry_items (
 id uuid primary key default gen_random_uuid(),case_id uuid not null references public.hm_cases(id),
 request_key uuid not null unique,kind text not null check(kind in ('document','authority','submission','certificate')),
 body jsonb not null check(jsonb_typeof(body)='object' and octet_length(body::text)<=16384),version integer not null default 1,
 created_by uuid not null references auth.users(id),updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index hm_registry_items_case on marriages_private.registry_items(case_id,kind);
create table marriages_private.registry_item_revisions (
 item_id uuid not null references marriages_private.registry_items(id),version integer not null,body jsonb not null,
 actor uuid not null references auth.users(id),recorded_at timestamptz not null default now(),primary key(item_id,version)
);
create table marriages_private.registry_revisions (
 case_id uuid not null references public.hm_cases(id),version integer not null,body jsonb not null,
 actor uuid,recorded_at timestamptz not null default now(),primary key(case_id,version)
);
-- Preserve the current record before tracking subsequent amendments.
insert into marriages_private.registry_revisions(case_id,version,body) select case_id,version,payload from public.hm_registry;
alter table marriages_private.registry_items enable row level security;
alter table marriages_private.registry_item_revisions enable row level security;
alter table marriages_private.registry_revisions enable row level security;
revoke all on marriages_private.registry_items,marriages_private.registry_item_revisions,marriages_private.registry_revisions from public,anon,authenticated;
create function marriages_private.registry_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into marriages_private.registry_revisions(case_id,version,body,actor) values(new.case_id,new.version,new.payload,auth.uid());return new;
end; $$;
revoke all on function marriages_private.registry_snapshot() from public,anon,authenticated;
create trigger registry_snapshot after insert or update on public.hm_registry for each row execute function marriages_private.registry_snapshot();

create function marriages_private.registry_item_valid(kind text,body jsonb) returns void language plpgsql set search_path='' as $$
declare allowed text[];key text;value jsonb;
begin
 if kind not in ('document','authority','submission','certificate') or jsonb_typeof(body)<>'object' or octet_length(body::text)>16384 then raise exception 'Invalid registry evidence';end if;
 allowed:=array['title','person_reference','status','reference','issuer','date','reviewed_on','expires_on','source','reason','required'];
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

create function marriages_private.hm_registry_items(target uuid,item_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['counsellor','records']) then raise exception 'Restricted' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) into result from marriages_private.registry_items r where r.case_id=target and r.kind=item_kind;
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'registry_items','read');return result;
end; $$;
create function marriages_private.hm_registry_item_save(target uuid,item_id uuid,item_kind text,expected_version integer,body jsonb,request_key uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result marriages_private.registry_items;
begin
 if not marriages_private.has_scope(target,array['counsellor','records']) then raise exception 'Restricted' using errcode='42501';end if;
 perform marriages_private.registry_item_valid(item_kind,body);
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
create function marriages_private.hm_registry_history(target uuid,item_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['counsellor','records']) then raise exception 'Restricted' using errcode='42501';end if;
 if item_id is null then select coalesce(jsonb_agg(to_jsonb(r) order by version desc),'[]'::jsonb) into result from marriages_private.registry_revisions r where r.case_id=target;
 else select coalesce(jsonb_agg(to_jsonb(r) order by r.version desc),'[]'::jsonb) into result from marriages_private.registry_item_revisions r join marriages_private.registry_items i on i.id=r.item_id where i.id=hm_registry_history.item_id and i.case_id=target;end if;
 insert into marriages_private.audit(case_id,actor,object_name,operation,object_id) values(target,auth.uid(),'registry_history','read',item_id);return result;
end; $$;
create function marriages_private.hm_registry_update(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['participant']) then raise exception 'Restricted' using errcode='42501';end if;
 select case when payload->'summary_released'='true'::jsonb then jsonb_build_object('status',payload->>'status','summary',payload->>'participant_summary','proposed_date',payload->>'date','ceremony_date',payload->>'actualDate','venue',payload->>'venue') else jsonb_build_object('summary','No wedding update has been released yet.') end into result from public.hm_registry where case_id=target;
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'registry_update','read');return result;
end; $$;

create or replace function marriages_private.validate_payload() returns trigger language plpgsql set search_path='' as $$
declare allowed text[];key text;value jsonb;status text;
begin
 allowed:=case tg_table_name
 when 'hm_care' then array['background','wellbeing','preparation','family_visits','session_notes','consent_version']
 when 'hm_registry' then array['kind','country','region','venue','date','actualDate','officiant','witnesses','authority','eligibility','evidence','receipt','acknowledgement','status','ceremony_status','application_reference','authorization_reference','official_channel','submitted_on','correction_reason','participant_summary','summary_released']
 else array['next_date','timezone','channel','safe_contact','followup_permission','appointment_status'] end;
 for key,value in select * from jsonb_each(new.payload) loop
  if not key=any(allowed) then raise exception 'Unsupported field';end if;
  if key in ('authority','eligibility','followup_permission','summary_released') then if jsonb_typeof(value)<>'boolean' then raise exception 'Boolean field required';end if;
  elsif jsonb_typeof(value)<>'string' then raise exception 'Text field required';end if;
 end loop;
 if tg_table_name='hm_registry' then
  status:=coalesce(new.payload->>'status','Planning');
  if length(coalesce(new.payload->>'ceremony_status',''))>0 and new.payload->>'ceremony_status' not in ('proposed','scheduled','celebrated','postponed','cancelled') then raise exception 'Invalid ceremony status';end if;
  if status not in ('Planning','Requirements pending','Submitted','Correction requested','Authorised','Ceremony recorded','Return submitted','Verified','Rejected','Expired','Postponed','Cancelled') then raise exception 'Invalid registry status';end if;
  foreach key in array array['date','actualDate','submitted_on'] loop
   if length(coalesce(new.payload->>key,''))>0 then if new.payload->>key!~'^\d{4}-\d{2}-\d{2}$' then raise exception 'ISO date required';end if;perform (new.payload->>key)::date;end if;
  end loop;
  if tg_op='UPDATE' and old.payload->'authority'='true'::jsonb and exists(select from unnest(array['country','region','venue','date','actualDate','officiant']) k where old.payload->>k is distinct from new.payload->>k) and (new.payload->'authority'='true'::jsonb or new.payload->'eligibility'='true'::jsonb) then raise exception 'Reopen verification after ceremony details change';end if;
  if status in ('Authorised','Ceremony recorded','Return submitted','Verified') then
   if new.payload->'authority' is distinct from 'true'::jsonb or new.payload->'eligibility' is distinct from 'true'::jsonb then raise exception 'Reviewed authority and eligibility required';end if;
   foreach key in array array['country','region','venue','officiant','evidence'] loop if length(trim(coalesce(new.payload->>key,'')))=0 then raise exception 'Ceremony evidence incomplete';end if;end loop;
  end if;
  if status='Authorised' and length(trim(coalesce(new.payload->>'authorization_reference','')))=0 then raise exception 'Official authorization reference required';end if;
  if status in ('Ceremony recorded','Return submitted','Verified') and (length(coalesce(new.payload->>'actualDate',''))=0 or length(trim(coalesce(new.payload->>'witnesses','')))=0) then raise exception 'Actual ceremony and witnesses required';end if;
  if status in ('Submitted','Return submitted','Verified') then foreach key in array array['application_reference','official_channel','submitted_on','receipt'] loop if length(trim(coalesce(new.payload->>key,'')))=0 then raise exception 'Submission record incomplete';end if;end loop;end if;
  if status='Correction requested' and (length(trim(coalesce(new.payload->>'correction_reason','')))=0 or length(trim(coalesce(new.payload->>'application_reference','')))=0) then raise exception 'Correction request reference and reason required';end if;
  if status='Verified' then
   if length(trim(coalesce(new.payload->>'acknowledgement','')))=0 then raise exception 'Official acknowledgement required';end if;
   if not exists(select from marriages_private.registry_items r where r.case_id=new.case_id and r.kind='certificate' and r.body->>'certificate_type' in ('official_marriage','certified_copy','replacement','amendment') and r.body->>'status'='verified') then raise exception 'Verified official certificate record required';end if;
   if exists(select from marriages_private.registry_items r where r.case_id=new.case_id and r.kind in ('document','authority') and r.body->'required'='true'::jsonb and (r.body->>'status'<>'reviewed' or (length(coalesce(r.body->>'expires_on',''))>0 and (r.body->>'expires_on')::date<coalesce(nullif(new.payload->>'actualDate','')::date,nullif(new.payload->>'date','')::date,current_date)))) then raise exception 'Required evidence review is incomplete or expired';end if;
  end if;
  if new.payload->'summary_released'='true'::jsonb and length(trim(coalesce(new.payload->>'participant_summary','')))=0 then raise exception 'Reviewed participant summary required';end if;
 end if;
 if tg_table_name='hm_logistics' and length(coalesce(new.payload->>'next_date',''))>0 and new.payload->'followup_permission' is distinct from 'true'::jsonb then raise exception 'Follow-up permission required';end if;
 return new;
end; $$;
create function marriages_private.registry_evidence_valid(target uuid,payload jsonb) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select from marriages_private.registry_items r where r.case_id=target and r.kind='certificate' and r.body->>'certificate_type' in ('official_marriage','certified_copy','replacement','amendment') and r.body->>'status'='verified')
 and not exists(select from marriages_private.registry_items r where r.case_id=target and r.kind in ('document','authority') and r.body->'required'='true'::jsonb and (r.body->>'status'<>'reviewed' or (length(coalesce(r.body->>'expires_on',''))>0 and (r.body->>'expires_on')::date<coalesce(nullif(payload->>'actualDate','')::date,nullif(payload->>'date','')::date,current_date))));
$$;
revoke all on function marriages_private.registry_evidence_valid(uuid,jsonb) from public,anon,authenticated;
create function marriages_private.registry_recheck() returns trigger language plpgsql security definer set search_path='' as $$
declare record public.hm_registry;
begin
 select * into record from public.hm_registry where case_id=new.case_id for update;
 if record.payload->>'status'='Verified' and not marriages_private.registry_evidence_valid(new.case_id,record.payload) then
 update public.hm_registry set payload=payload||jsonb_build_object('status','Requirements pending','authority',false,'eligibility',false,'summary_released',false) where case_id=new.case_id;
 end if;return new;
end; $$;
revoke all on function marriages_private.registry_recheck() from public,anon,authenticated;
create trigger registry_recheck after insert or update on marriages_private.registry_items for each row execute function marriages_private.registry_recheck();

-- Trigger must read private checklist rows without granting callers direct access.
alter function marriages_private.validate_payload() security definer;
revoke all on function marriages_private.validate_payload() from public,anon,authenticated;

create function public.hm_registry_items(target uuid,item_kind text) returns jsonb language sql security invoker set search_path='' as $$ select marriages_private.hm_registry_items(target,item_kind) $$;
create function public.hm_registry_item_save(target uuid,item_id uuid,item_kind text,expected_version integer,body jsonb,request_key uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select marriages_private.hm_registry_item_save(target,item_id,item_kind,expected_version,body,request_key) $$;
create function public.hm_registry_history(target uuid,item_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select marriages_private.hm_registry_history(target,item_id) $$;
create function public.hm_registry_update(target uuid) returns jsonb language sql security invoker set search_path='' as $$ select marriages_private.hm_registry_update(target) $$;
do $$ declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','marriages_private') and p.proname in ('hm_registry_items','hm_registry_item_save','hm_registry_history','hm_registry_update') loop
 execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
