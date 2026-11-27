begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table marriages_private.invites (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.hm_cases(id),
 token_hash text not null unique, created_by uuid not null references auth.users(id),
 expires_at timestamptz not null default now()+interval '7 days', claimed_by uuid references auth.users(id),
 claimed_at timestamptz, approved_at timestamptz, revoked_at timestamptz
);
create table marriages_private.consent_events (
 id bigint generated always as identity primary key, case_id uuid not null references public.hm_cases(id),
 person_id uuid not null references auth.users(id), purpose text not null check(purpose in ('care','partner_sharing','family_contact','followup','publicity')),
 notice_version text not null check(notice_version='hm-privacy-v1'), granted boolean not null,
 created_at timestamptz not null default now()
);
create index hm_consent_lookup on marriages_private.consent_events(case_id,person_id,purpose,id desc);
create table marriages_private.rights_requests (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.hm_cases(id),
 person_id uuid not null references auth.users(id), kind text not null check(kind in ('access','correction','deletion')),
 status text not null default 'received' check(status in ('received','reviewing','completed','declined')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table marriages_private.retention_reviews (
 case_id uuid primary key references public.hm_cases(id), review_on date,
 legal_hold boolean not null default false, rationale text not null default '', reviewed_by uuid references auth.users(id),
 updated_at timestamptz not null default now()
);
do $$ declare t text; begin foreach t in array array['invites','consent_events','rights_requests','retention_reviews'] loop
 execute format('alter table marriages_private.%I enable row level security',t);
 execute format('revoke all on marriages_private.%I from public,anon,authenticated',t);
end loop; end $$;

create function marriages_private.consented(target uuid, person uuid, reason text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select granted from marriages_private.consent_events
 where case_id=target and person_id=person and purpose=reason order by id desc limit 1),false);
$$;
revoke all on function marriages_private.consented(uuid,uuid,text) from public,anon,authenticated;

-- A claimed invitation does not grant access. A counsellor must separately verify identity.
create function public.hm_issue_invite(target uuid) returns text
language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 perform 1 from public.hm_cases where id=target for update;
 if (select count(*) from marriages_private.assignments where case_id=target and scope='participant')>=2 then raise exception 'Two participants already linked'; end if;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into marriages_private.invites(case_id,token_hash,created_by) values(target,encode(extensions.digest(token,'sha256'),'hex'),auth.uid());
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'invite','issue');
 return token;
end; $$;
create function public.hm_claim_invite(code text) returns void
language plpgsql security definer set search_path='' as $$
declare invitation marriages_private.invites;
begin
 if auth.uid() is null or length(code)<>64 then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 select * into invitation from marriages_private.invites where token_hash=encode(extensions.digest(code,'sha256'),'hex') for update;
 if invitation.id is null or invitation.expires_at<=now() or invitation.revoked_at is not null or invitation.claimed_by is not null then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 update marriages_private.invites set claimed_by=auth.uid(),claimed_at=now() where id=invitation.id;
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(invitation.case_id,auth.uid(),'invite','claim');
end; $$;
create function public.hm_pending_invites(target uuid) returns table(id uuid,claimed_by uuid,claimed_at timestamptz,expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 return query select i.id,i.claimed_by,i.claimed_at,i.expires_at from marriages_private.invites i where i.case_id=target and i.revoked_at is null and i.approved_at is null;
end; $$;
create function public.hm_review_invite(invite_id uuid,approve boolean,identity_checked boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare invitation marriages_private.invites;
begin
 select * into invitation from marriages_private.invites where id=invite_id for update;
 if invitation.id is null or not marriages_private.has_scope(invitation.case_id,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 perform 1 from public.hm_cases where id=invitation.case_id for update;
 if approve then
  if not identity_checked or invitation.claimed_by is null or invitation.expires_at<=now() or invitation.revoked_at is not null or invitation.approved_at is not null then raise exception 'Identity review and valid claim required'; end if;
  if invitation.claimed_by=auth.uid() then raise exception 'Cannot approve your own participant link'; end if;
  if (select count(*) from marriages_private.assignments where case_id=invitation.case_id and scope='participant')>=2 then raise exception 'Two participants already linked'; end if;
  if exists(select from marriages_private.assignments where case_id=invitation.case_id and user_id=invitation.claimed_by) then raise exception 'Account already assigned'; end if;
  insert into marriages_private.assignments values(invitation.case_id,invitation.claimed_by,'participant');
  update marriages_private.invites set approved_at=now() where id=invite_id;
 else update marriages_private.invites set revoked_at=now() where id=invite_id;
 end if;
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(invitation.case_id,auth.uid(),'invite',case when approve then 'approve' else 'revoke' end);
end; $$;
create function public.hm_revoke_participant(target uuid,person uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 delete from marriages_private.assignments where case_id=target and user_id=person and scope='participant';
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'participant','revoke');
end; $$;
create function public.hm_participants(target uuid) returns table(user_id uuid)
language plpgsql security definer set search_path='' as $$
begin
 if not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 return query select a.user_id from marriages_private.assignments a where a.case_id=target and scope='participant';
end; $$;

create function public.hm_record_consent(target uuid,reason text,decision boolean,notice text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not marriages_private.has_scope(target,array['participant']) then raise exception 'Restricted' using errcode='42501'; end if;
 insert into marriages_private.consent_events(case_id,person_id,purpose,notice_version,granted) values(target,auth.uid(),reason,notice,decision);
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'consent','record');
end; $$;
create function public.hm_my_consent(target uuid) returns table(id bigint,purpose text,notice_version text,granted boolean,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if not marriages_private.has_scope(target,array['participant']) then raise exception 'Restricted' using errcode='42501'; end if;
 return query select e.id,e.purpose,e.notice_version,e.granted,e.created_at from marriages_private.consent_events e where e.case_id=target and e.person_id=auth.uid() order by e.id desc;
end; $$;

-- Reads use authenticated RPCs so access to payloads also creates an audit event.
create function public.hm_list_cases() returns setof public.hm_cases
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into marriages_private.audit(case_id,actor,object_name,operation) select c.id,auth.uid(),'case','read' from public.hm_cases c where marriages_private.has_scope(c.id,array['counsellor','records','coordinator','participant']);
 return query select c.* from public.hm_cases c where marriages_private.has_scope(c.id,array['counsellor','records','coordinator','participant']) order by c.created_at desc;
end; $$;
create function public.hm_get_record(target uuid,kind text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; scopes text[];
begin
 scopes:=case kind when 'hm_care' then array['counsellor'] when 'hm_registry' then array['counsellor','records'] when 'hm_logistics' then array['counsellor','coordinator'] else null end;
 if scopes is null or not marriages_private.has_scope(target,scopes) then raise exception 'Restricted' using errcode='42501'; end if;
 execute format('select to_jsonb(r) from public.%I r where case_id=$1',kind) into result using target;
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),kind,'read');
 return result;
end; $$;
create function public.hm_save_record(target uuid,kind text,expected_version integer,body jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; scopes text[];
begin
 scopes:=case kind when 'hm_care' then array['counsellor'] when 'hm_registry' then array['counsellor','records'] when 'hm_logistics' then array['counsellor','coordinator'] else null end;
 if scopes is null or not marriages_private.has_scope(target,scopes) then raise exception 'Restricted' using errcode='42501'; end if;
 execute format('update public.%I set payload=$1 where case_id=$2 and version=$3 returning to_jsonb(%I)',kind,kind) into result using body,target,expected_version;
 if result is null then raise exception 'Record changed; reopen before saving' using errcode='PT409'; end if;
 return result;
end; $$;
create function public.hm_get_answers(target uuid) returns setof public.hm_answers
language plpgsql security definer set search_path='' as $$
begin
 if not marriages_private.has_scope(target,array['counsellor','participant']) then raise exception 'Restricted' using errcode='42501'; end if;
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'answers','read');
 return query select r.* from public.hm_answers r where r.case_id=target and (
 marriages_private.has_scope(target,array['counsellor']) or r.author_id=auth.uid() or
 (r.visibility='shared' and marriages_private.consented(target,r.author_id,'partner_sharing')));
end; $$;
create function public.hm_save_answer(target uuid,key text,body text,share text,expected_version integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['participant']) or not marriages_private.consented(target,auth.uid(),'care') then raise exception 'Participant consent required' using errcode='42501'; end if;
 if share='shared' and not marriages_private.consented(target,auth.uid(),'partner_sharing') then raise exception 'Sharing permission required' using errcode='42501'; end if;
 if expected_version is null then
 insert into public.hm_answers(case_id,author_id,question_key,answer,visibility) values(target,auth.uid(),key,body,share) returning to_jsonb(hm_answers) into result;
 else
 update public.hm_answers set answer=body,visibility=share where case_id=target and author_id=auth.uid() and question_key=key and version=expected_version returning to_jsonb(hm_answers) into result;
 end if;
 if result is null then raise exception 'Answer changed; reopen before saving' using errcode='PT409'; end if;
 return result;
end; $$;

create function public.hm_request_right(target uuid,request_kind text) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not marriages_private.has_scope(target,array['participant']) then raise exception 'Restricted' using errcode='42501'; end if;
 insert into marriages_private.rights_requests(case_id,person_id,kind) values(target,auth.uid(),request_kind) returning id into result;
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'rights_request','create');
 return result;
end; $$;
create function public.hm_rights_requests(target uuid) returns setof marriages_private.rights_requests
language plpgsql security definer set search_path='' as $$
begin
 if not marriages_private.has_scope(target,array['counsellor','participant']) then raise exception 'Restricted' using errcode='42501'; end if;
 return query select r.* from marriages_private.rights_requests r where r.case_id=target and (r.person_id=auth.uid() or marriages_private.has_scope(target,array['counsellor']));
end; $$;
create function public.hm_review_right(request_id uuid,next_status text) returns void
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 select case_id into target from marriages_private.rights_requests where id=request_id;
 if target is null or not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 update marriages_private.rights_requests set status=next_status,updated_at=now() where id=request_id;
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'rights_request','review');
end; $$;
create function public.hm_retention(target uuid,review_date date default null,hold boolean default null,rationale text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 if hold is not null then
 if length(trim(coalesce(rationale,'')))=0 or length(rationale)>1000 then raise exception 'Review rationale required'; end if;
 insert into marriages_private.retention_reviews(case_id,review_on,legal_hold,rationale,reviewed_by) values(target,review_date,hold,rationale,auth.uid())
 on conflict(case_id) do update set review_on=excluded.review_on,legal_hold=excluded.legal_hold,rationale=excluded.rationale,reviewed_by=auth.uid(),updated_at=now();
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'retention','review');
 end if;
 select to_jsonb(r) into result from marriages_private.retention_reviews r where case_id=target;
 return result;
end; $$;
create function public.hm_audit(target uuid) returns table(id bigint,object_name text,operation text,occurred_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 if not marriages_private.has_scope(target,array['counsellor']) then raise exception 'Restricted' using errcode='42501'; end if;
 return query select a.id,a.object_name,a.operation,a.occurred_at from marriages_private.audit a where a.case_id=target order by a.id desc limit 200;
end; $$;

create function public.hm_export_own(target uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not marriages_private.has_scope(target,array['participant']) then raise exception 'Restricted' using errcode='42501'; end if;
 select jsonb_build_object('case_id',target,'exported_at',now(),
 'answers',coalesce((select jsonb_agg(to_jsonb(r)) from public.hm_answers r where r.case_id=target and r.author_id=auth.uid()),'[]'::jsonb),
 'consent_history',coalesce((select jsonb_agg(to_jsonb(e)) from marriages_private.consent_events e where e.case_id=target and e.person_id=auth.uid()),'[]'::jsonb),
 'requests',coalesce((select jsonb_agg(to_jsonb(q)) from marriages_private.rights_requests q where q.case_id=target and q.person_id=auth.uid()),'[]'::jsonb)) into result;
 insert into marriages_private.audit(case_id,actor,object_name,operation) values(target,auth.uid(),'own_records','export');
 return result;
end; $$;

-- No payload-table access through the Data API: all reads/writes are scoped and audited above.
revoke all on public.hm_cases,public.hm_care,public.hm_registry,public.hm_logistics,public.hm_answers from anon,authenticated;
-- Keep privileged implementations in a non-exposed schema. Public RPCs are invoker wrappers.
do $$ declare f record; names text; begin
 for f in select p.oid,p.proname,p.oid::regprocedure as signature,
 pg_get_function_arguments(p.oid) as arguments,pg_get_function_result(p.oid) as result,p.proargnames,p.pronargs
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
 ('hm_create_case','hm_my_access','hm_issue_invite','hm_claim_invite','hm_pending_invites','hm_review_invite','hm_revoke_participant','hm_participants','hm_record_consent','hm_my_consent','hm_list_cases','hm_get_record','hm_save_record','hm_get_answers','hm_save_answer','hm_request_right','hm_rights_requests','hm_review_right','hm_retention','hm_audit','hm_export_own') loop
 select string_agg(quote_ident(arg),',') into names from unnest(f.proargnames[1:f.pronargs]) arg;
 execute format('alter function %s set schema marriages_private',f.signature);
 execute format('create function public.%I(%s) returns %s language sql security invoker set search_path='''' as %L',f.proname,f.arguments,f.result,format('select * from marriages_private.%I(%s)',f.proname,coalesce(names,'')));
 end loop;
end $$;
-- Explicit grants for new functions only; never grant all public functions.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','marriages_private') and p.proname in ('hm_create_case','hm_my_access','hm_issue_invite','hm_claim_invite','hm_pending_invites','hm_review_invite','hm_revoke_participant','hm_participants','hm_record_consent','hm_my_consent','hm_list_cases','hm_get_record','hm_save_record','hm_get_answers','hm_save_answer','hm_request_right','hm_rights_requests','hm_review_right','hm_retention','hm_audit','hm_export_own') loop
 execute format('revoke all on function %s from public,anon',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
commit;
