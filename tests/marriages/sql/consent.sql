\set ON_ERROR_STOP on
begin;
insert into auth.users(id) select ('10000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,7) n;
insert into marriages_private.staff values('10000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.hm_create_case('Synthetic linked couple','premarital') as case_id \gset
select set_config('test.case_id',:'case_id',true);
select public.hm_issue_invite(:'case_id') as code \gset
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select public.hm_claim_invite(:'code');
do $$ begin
 if exists(select from public.hm_list_cases()) then raise exception 'Unreviewed claim grants access'; end if;
 begin perform public.hm_get_record(current_setting('test.case_id')::uuid,'hm_care'); raise exception 'Unreviewed care leak'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select id as invite_id from public.hm_pending_invites(:'case_id') where claimed_by is not null \gset
select set_config('test.invite_id',:'invite_id',true);
do $$ begin
 begin perform public.hm_review_invite(current_setting('test.invite_id')::uuid,true,false); raise exception 'Missing identity review accepted'; exception when raise_exception then if sqlerrm='Missing identity review accepted' then raise; end if; end;
end $$;
select public.hm_review_invite(:'invite_id',true,true);
select public.hm_issue_invite(:'case_id') as code2 \gset
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select public.hm_claim_invite(:'code2');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select id as invite_id2 from public.hm_pending_invites(:'case_id') where claimed_by is not null \gset
select public.hm_review_invite(:'invite_id2',true,true);
do $$ begin
 begin perform public.hm_issue_invite(current_setting('test.case_id')::uuid); raise exception 'Third participant permitted'; exception when raise_exception then if sqlerrm='Third participant permitted' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
 begin perform public.hm_save_answer(current_setting('test.case_id')::uuid,'meaning_1','synthetic','sealed',null); raise exception 'Missing care consent allowed'; exception when insufficient_privilege then null; end;
 begin perform * from public.hm_answers; raise exception 'Direct table access allowed'; exception when insufficient_privilege then null; end;
end $$;
select public.hm_record_consent(:'case_id','care',true,'hm-privacy-v1');
select public.hm_save_answer(:'case_id','meaning_2','SYNTHETIC SEALED','sealed',null);
do $$ begin
 begin perform public.hm_save_answer(current_setting('test.case_id')::uuid,'meaning_1','synthetic','shared',null); raise exception 'Missing sharing consent allowed'; exception when insufficient_privilege then null; end;
end $$;
select public.hm_record_consent(:'case_id','partner_sharing',true,'hm-privacy-v1');
select public.hm_save_answer(:'case_id','meaning_1','SYNTHETIC SHARED','shared',null);
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
do $$ begin
 if (select count(*) from public.hm_get_answers(current_setting('test.case_id')::uuid))<>1 then raise exception 'Partner sealed boundary failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select public.hm_record_consent(:'case_id','partner_sharing',false,'hm-privacy-v1');
select public.hm_request_right(:'case_id','deletion');
do $$ begin if (select count(*) from public.hm_my_consent(current_setting('test.case_id')::uuid))<>3 then raise exception 'Consent history lost'; end if; end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
do $$ begin
 if exists(select from public.hm_get_answers(current_setting('test.case_id')::uuid)) then raise exception 'Sharing withdrawal ineffective'; end if;
 if exists(select from public.hm_rights_requests(current_setting('test.case_id')::uuid)) then raise exception 'Partner rights leak'; end if;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select public.hm_retention(:'case_id','2027-01-01',true,'Synthetic review hold');
select public.hm_get_record(:'case_id','hm_care');
select public.hm_save_record(:'case_id','hm_care',1,'{"background":"synthetic"}');
do $$ begin
 begin perform public.hm_save_record(current_setting('test.case_id')::uuid,'hm_care',1,'{}'); raise exception 'Stale RPC write accepted'; exception when sqlstate 'PT409' then null; end;
 if (select count(*) from public.hm_get_answers(current_setting('test.case_id')::uuid))<>2 then raise exception 'Counsellor missing sealed responses'; end if;
 if not exists(select from public.hm_audit(current_setting('test.case_id')::uuid) where operation='read') then raise exception 'Read audit absent'; end if;
 if (select count(*) from public.hm_rights_requests(current_setting('test.case_id')::uuid))<>1 then raise exception 'Rights workflow absent'; end if;
end $$;
select public.hm_revoke_participant(:'case_id','10000000-0000-0000-0000-000000000002');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$ begin
 begin perform public.hm_get_answers(current_setting('test.case_id')::uuid); raise exception 'Revoked participant can read'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if exists(select from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'hm_%' and prosecdef) then raise exception 'Privileged implementation publicly exposed'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform public.hm_list_cases(); raise exception 'Anon RPC permitted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
\echo PASS: invitation review/capacity, consent history/withdrawal, rights/retention, audited RPCs, stale writes, revocation, anonymous denial and private privileged implementations
