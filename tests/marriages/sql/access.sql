\set ON_ERROR_STOP on
begin;
insert into auth.users(id) select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,7) n;
insert into marriages_private.staff values('00000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.hm_create_case('Synthetic couple','premarital') as case_id \gset
reset role;
insert into marriages_private.assignments values
 (:'case_id','00000000-0000-0000-0000-000000000002','participant'),
 (:'case_id','00000000-0000-0000-0000-000000000003','participant'),
 (:'case_id','00000000-0000-0000-0000-000000000004','records'),
 (:'case_id','00000000-0000-0000-0000-000000000005','coordinator');
-- Store test case in session setting to make DO assertions easy.
select set_config('test.case_id',:'case_id',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
insert into public.hm_answers(case_id,author_id,question_key,answer,visibility) values
 (:'case_id',auth.uid(),'meaning_1','SYNTHETIC SHARED','shared'),
 (:'case_id',auth.uid(),'meaning_2','SYNTHETIC SEALED','sealed');
do $$ begin
 if (select count(*) from public.hm_answers)<>2 then raise exception 'Own answers missing'; end if;
 begin insert into marriages_private.assignments values(current_setting('test.case_id')::uuid,auth.uid(),'counsellor'); raise exception 'Self promotion allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.hm_answers(case_id,author_id,question_key,answer) values(current_setting('test.case_id')::uuid,'00000000-0000-0000-0000-000000000003','fake','test'); raise exception 'Forged author allowed'; exception when insufficient_privilege then null; end;
 begin perform public.hm_create_case('Unauthorized','personal'); raise exception 'Unauthorized create allowed'; exception when insufficient_privilege then null; end;
end $$;
do $$ begin
 begin update public.hm_answers set author_id='00000000-0000-0000-0000-000000000003'; raise exception 'Author reassignment allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.hm_answers(case_id,author_id,question_key,answer) values(current_setting('test.case_id')::uuid,auth.uid(),'health_1','clinical result'); raise exception 'Clinical answer accepted'; exception when check_violation then null; end;
end $$;
update public.hm_answers set answer='SYNTHETIC SEALED UPDATED' where question_key='meaning_2' and version=1;
update public.hm_answers set answer='STALE' where question_key='meaning_2' and version=1;
do $$ begin if exists(select from public.hm_answers where answer='STALE') then raise exception 'Stale answer accepted'; end if; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
 if (select count(*) from public.hm_answers)<>1 then raise exception 'Partner sealed answer leak'; end if;
 if (select count(*) from public.hm_care)<>0 then raise exception 'Partner care leak'; end if;
 if exists(select from public.hm_answers where visibility='sealed') then raise exception 'Sealed leak'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',true);
do $$ begin
 if (select count(*) from public.hm_registry)<>1 then raise exception 'Records access missing'; end if;
 if (select count(*) from public.hm_answers)<>0 or (select count(*) from public.hm_care)<>0 or (select count(*) from public.hm_logistics)<>0 then raise exception 'Records scope leak'; end if;
 begin update public.hm_registry set payload='{"status":"Verified"}'; raise exception 'False verification accepted'; exception when raise_exception then if sqlerrm='False verification accepted' then raise; end if; end;
end $$;
update public.hm_registry set payload='{"status":"Verified","country":"Nigeria","region":"Synthetic district","venue":"Synthetic venue","officiant":"Synthetic official","witnesses":"Synthetic witnesses","actualDate":"2026-12-01","authority":true,"eligibility":true,"evidence":"SAMPLE","receipt":"SAMPLE","acknowledgement":"SAMPLE"}';
do $$ begin if (select payload->>'status' from public.hm_registry)<>'Verified' then raise exception 'Valid record missing'; end if; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',true);
do $$ begin
 if (select count(*) from public.hm_logistics)<>1 then raise exception 'Coordinator access missing'; end if;
 if (select count(*) from public.hm_care)<>0 or (select count(*) from public.hm_registry)<>0 or (select count(*) from public.hm_answers)<>0 then raise exception 'Coordinator scope leak'; end if;
 begin update public.hm_logistics set payload='{"session_notes":"private"}'; raise exception 'Unexpected key accepted'; exception when raise_exception then if sqlerrm='Unexpected key accepted' then raise; end if; end;
 begin update public.hm_logistics set payload='{"next_date":"2026-12-10"}'; raise exception 'Unconsented followup accepted'; exception when raise_exception then if sqlerrm='Unconsented followup accepted' then raise; end if; end;
end $$;
update public.hm_logistics set payload='{"followup_permission":true,"next_date":"2026-12-10"}';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000006',true);
do $$ begin
 if (select count(*) from public.hm_cases)<>0 or (select count(*) from public.hm_answers)<>0 then raise exception 'Unassigned user leak'; end if;
 if exists(select from public.hm_my_access()) then raise exception 'Unassigned scope leak'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
 if (select count(*) from public.hm_answers)<>2 then raise exception 'Assigned counsellor access missing'; end if;
 if (select count(*) from public.hm_care)<>1 then raise exception 'Care access missing'; end if;
end $$;
update public.hm_care set payload='{"background":"synthetic"}' where version=1;
do $$ begin
 if (select version from public.hm_care)<>2 then raise exception 'Version not advanced'; end if;
end $$;
update public.hm_care set payload='{"background":"stale"}' where version=1;
do $$ begin
 if (select payload->>'background' from public.hm_care)<>'synthetic' then raise exception 'Stale write allowed'; end if;
end $$;
reset role;
delete from marriages_private.assignments where user_id='00000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$ begin
 if (select count(*) from public.hm_care)<>0 or (select count(*) from public.hm_answers)<>0 then raise exception 'Revoked access persists'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from marriages_private.audit)<7 then raise exception 'Write audit missing'; end if;
end $$;
set local role anon;
do $$ begin
 begin perform * from public.hm_answers; raise exception 'Anon read allowed'; exception when insufficient_privilege then null; end;
 begin perform public.hm_create_case('Anon','personal'); raise exception 'Anon create allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
\echo PASS: creation, authorship, sealed/shared, scope isolation, denied self-promotion, registry evidence, consent, version conflict, audit, revocation and anonymous denial
