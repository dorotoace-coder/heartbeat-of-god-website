\set ON_ERROR_STOP on
begin;
insert into auth.users(id) select ('40000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,7) n;
insert into marriages_private.staff values('40000000-0000-0000-0000-000000000001',true),('40000000-0000-0000-0000-000000000007',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000003',true);
select public.hm_submit_enquiry('Élodie','personal','Participant initiates','No calls','French','hm-privacy-v1',true,'40000000-0000-0000-0000-000000000099') as enquiry_id \gset
select public.hm_submit_enquiry('Élodie','personal','Participant initiates','No calls','French','hm-privacy-v1',true,'40000000-0000-0000-0000-000000000099');
select set_config('test.enquiry_id',:'enquiry_id',true);
do $$ begin
 if jsonb_array_length(public.hm_my_enquiries())<>1 then raise exception 'Duplicate enquiry';end if;
 if exists(select from public.hm_list_cases()) then raise exception 'Enquiry granted case before triage';end if;
 begin perform public.hm_submit_enquiry('Second','personal','Reply','','','hm-privacy-v1',true,gen_random_uuid());raise exception 'Duplicate pending request allowed';exception when unique_violation then null;end;
 begin perform public.hm_triage_queue();raise exception 'Participant can read triage queue';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',true);
do $$ begin if public.hm_triage_queue()::text like '%No calls%' then raise exception 'Private reply preferences in queue';end if;end $$;
select public.hm_accept_enquiry(:'enquiry_id') as case_id \gset
select set_config('test.case_id',:'case_id',true);
select public.hm_accept_enquiry(:'enquiry_id');
select public.hm_people_list(:'case_id')->0->>'id' as own_person \gset
select set_config('test.own_person',:'own_person',true);
select public.hm_person_save(:'case_id',null,null,'{"preferred_name":"Other person","dependants_summary":"PRIVATE FAMILY","legal_name":"Other Legal"}','40000000-0000-0000-0000-000000000098')->>'id' as other_person \gset
select public.hm_person_save(:'case_id',null,null,'{"preferred_name":"Other person","dependants_summary":"PRIVATE FAMILY","legal_name":"Other Legal"}','40000000-0000-0000-0000-000000000098');
select set_config('test.other_person',:'other_person',true);
reset role;
insert into marriages_private.assignments values(:'case_id','40000000-0000-0000-0000-000000000002','records'),(:'case_id','40000000-0000-0000-0000-000000000004','participant');
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000003',true);
do $$ begin
 if jsonb_array_length(public.hm_people_list(current_setting('test.case_id')::uuid))<>1 then raise exception 'Partner person-profile leak';end if;
 begin perform public.hm_person_save(current_setting('test.case_id')::uuid,current_setting('test.other_person')::uuid,1,'{"preferred_name":"Forged"}');raise exception 'Partner profile modification';exception when insufficient_privilege then null;end;
end $$;
select public.hm_person_save(:'case_id',:'own_person',1,'{"preferred_name":"Élodie","phone":"Synthetic contact","nationality":"Example nationality","dependants_summary":"PRIVATE RESPONSIBILITIES"}');
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000002',true);
do $$ begin
 if public.hm_people_list(current_setting('test.case_id')::uuid)::text like '%PRIVATE%' then raise exception 'Records role saw family background';end if;
 begin perform public.hm_person_save(current_setting('test.case_id')::uuid,current_setting('test.other_person')::uuid,1,'{"preferred_name":"Forged"}');raise exception 'Records role modified profile';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',true);
select public.hm_person_link_account(:'case_id',:'other_person','40000000-0000-0000-0000-000000000004',true);
select public.hm_create_case('Another assigned journey','personal') as other_case \gset
select public.hm_person_reuse(:'other_case',:'case_id',:'own_person',true);
do $$ begin
 if jsonb_array_length(public.hm_person_history(current_setting('test.case_id')::uuid,current_setting('test.own_person')::uuid))<>2 then raise exception 'Person history missing';end if;
 begin perform public.hm_journey_save(current_setting('test.case_id')::uuid,null,'intake',null,jsonb_build_object('title','Wrong person','status','draft','preferred_name','Sample','contact_method','Reply','notice_version','hm-privacy-v1','acknowledged',true,'person_id',gen_random_uuid()::text));raise exception 'Unlinked person referenced';exception when raise_exception then if sqlerrm='Unlinked person referenced' then raise;end if;end;
end $$;
reset role;
create table if not exists public.member_profile_intake(user_id uuid primary key,person_id uuid,reviewed_at timestamptz);
insert into public.member_profile_intake values('40000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000097',now());
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000001',true);
select public.hm_person_link_member(:'case_id',:'other_person','40000000-0000-0000-0000-000000000097',true);
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000007',true);
do $$ begin
 begin perform public.hm_accept_enquiry(current_setting('test.enquiry_id')::uuid);raise exception 'Accepted request reassigned';exception when sqlstate 'PT409' then null;end;
 begin perform public.hm_person_reuse(current_setting('test.case_id')::uuid,current_setting('test.case_id')::uuid,current_setting('test.own_person')::uuid,true);raise exception 'Cross-case identity bypass';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000003',true);
do $$ declare data jsonb;begin
 data:=public.hm_export_own(current_setting('test.case_id')::uuid);
 if data->'person_profile'->'body'->>'preferred_name'<>'Élodie' or data::text like '%Other Legal%' then raise exception 'Personal export boundary failed';end if;
end $$;
reset role;
rollback;
\echo PASS: one-person enquiry, retry/duplicate protection, private triage, stable person identity, scoped background, reviewed account/member links, cross-case reuse and own export
