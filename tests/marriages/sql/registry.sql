\set ON_ERROR_STOP on
begin;
insert into auth.users(id) select ('30000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,4) n;
insert into marriages_private.staff values('30000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000001',true);
select public.hm_create_case('Synthetic registry','premarital') as case_id \gset
select set_config('test.case_id',:'case_id',true);
reset role;
insert into marriages_private.assignments values(:'case_id','30000000-0000-0000-0000-000000000002','records'),(:'case_id','30000000-0000-0000-0000-000000000003','participant'),(:'case_id','30000000-0000-0000-0000-000000000004','coordinator');
set local role authenticated;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
select set_config('test.registry_body','{"kind":"Church ceremony","status":"Verified","ceremony_status":"celebrated","country":"Nigeria","region":"Synthetic district","venue":"Synthetic venue","date":"2026-11-20","actualDate":"2026-11-20","officiant":"Synthetic official","witnesses":"Synthetic witnesses","authority":true,"eligibility":true,"evidence":"SYNTHETIC REVIEW","application_reference":"SYNTHETIC APP","official_channel":"Synthetic registry","submitted_on":"2026-11-21","receipt":"SYNTHETIC RECEIPT","acknowledgement":"SYNTHETIC ACK","participant_summary":"Reviewed wedding update","summary_released":true}',true);
do $$ begin
 begin perform public.hm_save_record(current_setting('test.case_id')::uuid,'hm_registry',1,current_setting('test.registry_body')::jsonb);raise exception 'Verified without official certificate';exception when raise_exception then if sqlerrm='Verified without official certificate' then raise;end if;end;
end $$;
select public.hm_registry_item_save(:'case_id',null,'certificate',null,'{"title":"Commemorative","certificate_type":"church_commemorative","status":"verified","reference":"CHURCH-SAMPLE","source":"Synthetic review","reviewed_on":"2026-11-21","verification_reference":"SAMPLE"}');
do $$ begin
 begin perform public.hm_save_record(current_setting('test.case_id')::uuid,'hm_registry',1,current_setting('test.registry_body')::jsonb);raise exception 'Church certificate treated as official';exception when raise_exception then if sqlerrm='Church certificate treated as official' then raise;end if;end;
end $$;
select public.hm_registry_item_save(:'case_id',null,'certificate',null,'{"title":"Official certificate","certificate_type":"official_marriage","status":"verified","reference":"OFFICIAL-SAMPLE","source":"Synthetic registrar review","reviewed_on":"2026-11-21","verification_reference":"SAMPLE-VERIFICATION"}') ->>'id' as certificate_id \gset
select public.hm_registry_item_save(:'case_id',null,'document',null,'{"title":"Required document","document_type":"marital_status","status":"pending","required":true}') ->>'id' as document_id \gset
select set_config('test.document_id',:'document_id',true);
do $$ begin
 begin perform public.hm_save_record(current_setting('test.case_id')::uuid,'hm_registry',1,current_setting('test.registry_body')::jsonb);raise exception 'Pending required evidence accepted';exception when raise_exception then if sqlerrm='Pending required evidence accepted' then raise;end if;end;
end $$;
select public.hm_registry_item_save(:'case_id',:'document_id','document',1,'{"title":"Required document","document_type":"marital_status","status":"reviewed","required":true,"reference":"SAMPLE-DOC","source":"Synthetic review","reviewed_on":"2026-11-21","expires_on":"2026-11-21"}');
select public.hm_save_record(:'case_id','hm_registry',1,current_setting('test.registry_body')::jsonb);
do $$ begin
 begin perform public.hm_save_record(current_setting('test.case_id')::uuid,'hm_registry',2,current_setting('test.registry_body')::jsonb||'{"venue":"Changed venue"}');raise exception 'Venue change kept prior approval';exception when raise_exception then if sqlerrm='Venue change kept prior approval' then raise;end if;end;
 if jsonb_array_length(public.hm_registry_history(current_setting('test.case_id')::uuid))<>2 then raise exception 'Registry amendment snapshot missing';end if;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000003',true);
do $$ declare data jsonb;begin
 data:=public.hm_registry_update(current_setting('test.case_id')::uuid);
 if data->>'status'<>'Verified' or data::text like '%OFFICIAL-SAMPLE%' then raise exception 'Participant registry projection failed';end if;
 begin perform public.hm_registry_items(current_setting('test.case_id')::uuid,'document');raise exception 'Participant document leak';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000002',true);
select public.hm_registry_item_save(:'case_id',:'document_id','document',2,'{"title":"Required document","document_type":"marital_status","status":"rejected","required":true,"reason":"Synthetic source review changed"}');
do $$ declare data jsonb;begin
 data:=public.hm_get_record(current_setting('test.case_id')::uuid,'hm_registry');
 if data->'payload'->>'status'<>'Requirements pending' or data->'payload'->'summary_released'<>'false'::jsonb then raise exception 'Evidence change did not reopen review';end if;
 if jsonb_array_length(public.hm_registry_history(current_setting('test.case_id')::uuid,current_setting('test.document_id')::uuid))<>3 then raise exception 'Evidence amendment history missing';end if;
 begin perform public.hm_registry_item_save(current_setting('test.case_id')::uuid,null,'submission',null,'{"title":"Unconfirmed deadline","status":"prepared","due_on":"2026-12-01"}');raise exception 'Unsourced deadline accepted';exception when raise_exception then if sqlerrm='Unsourced deadline accepted' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','30000000-0000-0000-0000-000000000004',true);
do $$ begin
 begin perform public.hm_registry_items(current_setting('test.case_id')::uuid,'certificate');raise exception 'Coordinator certificate leak';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
\echo PASS: official vs church certificate, required evidence, verification reopening, amendments, source-backed deadlines and scoped participant updates
