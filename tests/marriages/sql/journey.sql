\set ON_ERROR_STOP on
begin;
insert into auth.users(id) select ('20000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,5) n;
insert into marriages_private.staff values('20000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select public.hm_create_case('Synthetic journey','premarital') as case_id \gset
select set_config('test.case_id',:'case_id',true);
reset role;
insert into marriages_private.assignments values
 (:'case_id','20000000-0000-0000-0000-000000000002','participant'),
 (:'case_id','20000000-0000-0000-0000-000000000003','coordinator'),
 (:'case_id','20000000-0000-0000-0000-000000000004','records');
set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
do $$ begin
 begin perform public.hm_journey_save(current_setting('test.case_id')::uuid,null,'family_visit',null,'{"title":"Visit","visit_type":"introduction","status":"planned","date":"2026-12-10","timezone":"Africa/Lagos"}');raise exception 'Unconsented visit accepted';exception when raise_exception then if sqlerrm='Unconsented visit accepted' then raise;end if;end;
 begin perform public.hm_journey_save(current_setting('test.case_id')::uuid,null,'session',null,'{"title":"Session","session_type":"joint","status":"planned","date":"2026-12-10","timezone":"Fake/Zone"}');raise exception 'Invalid timezone accepted';exception when raise_exception then if sqlerrm='Invalid timezone accepted' then raise;end if;end;
end $$;
select public.hm_journey_save(:'case_id',null,'family_visit',null,'{"title":"Family introduction","visit_type":"introduction","status":"planned","date":"2026-12-10","time":"19:00","timezone":"Africa/Lagos","permission":true,"private_note":"PRIVATE FAMILY NOTE","released":false}') ->>'id' as visit_id \gset
select public.hm_journey_save(:'case_id',null,'session',null,'{"title":"Private purpose","session_type":"joint","status":"planned","date":"2026-12-11","time":"19:00","timezone":"Africa/Lagos","channel":"Online","private_note":"PRIVATE SESSION NOTE","public_summary":"Agreed next appointment","released":true}') ->>'id' as session_id \gset
select set_config('test.session_id',:'session_id',true);
select public.hm_journey_save(:'case_id',null,'preparation',null,'{"title":"Repeatable","status":"draft"}','20000000-0000-0000-0000-000000000099');
select public.hm_journey_save(:'case_id',null,'preparation',null,'{"title":"Repeatable","status":"draft"}','20000000-0000-0000-0000-000000000099');
do $$ begin if jsonb_array_length(public.hm_journey_list(current_setting('test.case_id')::uuid,'preparation'))<>1 then raise exception 'Duplicate retry created entry'; end if; end $$;

select public.hm_journey_save(:'case_id',null,'prior_union',null,'{"title":"Reported union","status":"active","person_reference":"Synthetic person","union_type":"customary","union_status":"ongoing","same_partner":true,"evidence_status":"received","private_note":"PRIVATE PRIOR UNION"}');
select public.hm_journey_save(:'case_id',null,'intake',null,'{"title":"Enquiry","status":"active","preferred_name":"Élodie","contact_method":"Participant initiates","notice_version":"hm-privacy-v1","acknowledged":true,"language":"French","private_note":"PRIVATE BACKGROUND"}');
select public.hm_journey_save(:'case_id',:'visit_id','family_visit',1,'{"title":"Family introduction","visit_type":"introduction","status":"completed","date":"2026-12-10","timezone":"Africa/Lagos","permission":true,"outcome":"Agreed follow-up","private_note":"AMENDED PRIVATE FAMILY NOTE"}');
do $$ begin
 if jsonb_array_length(public.hm_journey_history(current_setting('test.case_id')::uuid,(select (public.hm_journey_list(current_setting('test.case_id')::uuid,'family_visit')->0->>'id')::uuid)))<>2 then raise exception 'Amendment history missing';end if;
 begin perform public.hm_journey_save(current_setting('test.case_id')::uuid,current_setting('test.session_id')::uuid,'session',0,'{"title":"Stale","session_type":"joint","status":"draft"}');raise exception 'Stale event accepted';exception when sqlstate 'PT409' then null;end;
end $$;
select public.hm_case_progress(:'case_id',1,'active','preparation','PRIVATE NEXT ACTION','2026-12-12','');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
do $$ declare data jsonb;begin
 if jsonb_array_length(public.hm_journey_list(current_setting('test.case_id')::uuid,'prior_union'))<>0 then raise exception 'Prior union leaked';end if;
 if jsonb_array_length(public.hm_journey_list(current_setting('test.case_id')::uuid,'family_visit'))<>0 then raise exception 'Unreleased family entry leaked';end if;
 data:=public.hm_journey_list(current_setting('test.case_id')::uuid,'session');
 if jsonb_array_length(data)<>1 or data::text like '%PRIVATE%' then raise exception 'Participant session redaction failed';end if;
 if exists(select from public.hm_list_cases() where next_action<>'') then raise exception 'Case action leaked';end if;
 begin perform public.hm_journey_save(current_setting('test.case_id')::uuid,null,'session',null,'{"title":"Forged","status":"draft"}');raise exception 'Participant can write events';exception when insufficient_privilege then null;end;
end $$;
select public.hm_record_consent(:'case_id','care',true,'hm-privacy-v1');
do $$ begin
 begin perform public.hm_save_answer(current_setting('test.case_id')::uuid,'decision_1','Hidden track answer','sealed',null);raise exception 'Wrong-track answer accepted';exception when raise_exception then if sqlerrm='Wrong-track answer accepted' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000003',true);
do $$ declare data jsonb;begin
 data:=public.hm_journey_list(current_setting('test.case_id')::uuid,'session');
 if data::text like '%PRIVATE%' or data::text like '%Private purpose%' or data::text like '%public_summary%' then raise exception 'Coordinator projection leak';end if;
 begin perform public.hm_journey_list(current_setting('test.case_id')::uuid,'prior_union');raise exception 'Coordinator prior-union access';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000004',true);
do $$ begin
 begin perform public.hm_journey_list(current_setting('test.case_id')::uuid,'session');raise exception 'Records officer care access';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000005',true);
do $$ begin
 begin perform public.hm_journey_list(current_setting('test.case_id')::uuid,'session');raise exception 'Unassigned event access';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
\echo PASS: structured intake/visits/unions/sessions, permission/timezone validation, amendments, stale writes, case-track persistence, hidden-track answers and private/shared projections
