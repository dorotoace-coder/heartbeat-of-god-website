\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('50000000-0000-0000-0000-000000000001');
insert into marriages_private.staff values('50000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000001',true);
select public.hm_create_case('Synthetic pilot','personal') as case_id \gset
select set_config('test.pilot_case',:'case_id',true);
do $$ begin
 if (public.hm_pilot_info()->>'review_on')::date<>((now() at time zone 'America/Winnipeg')::date)+30 then raise exception 'Pilot date incorrect';end if;
end $$;
reset role;
do $$ begin
 if not exists(select from marriages_private.retention_reviews r join marriages_private.pilot_settings p on p.singleton where r.case_id=current_setting('test.pilot_case')::uuid and r.review_on=p.review_on and r.reviewed_by is null and not r.legal_hold) then raise exception 'Missing review date or fabricated review';end if;
end $$;
update public.hm_cases set status='closed' where id=:'case_id';
do $$ begin
 if not exists(select from marriages_private.retention_reviews where case_id=current_setting('test.pilot_case')::uuid and review_on=(now() at time zone 'America/Winnipeg')::date) then raise exception 'Closure review missing';end if;
end $$;
update marriages_private.pilot_settings set started_on=current_date-31,review_on=current_date-1;
set local role authenticated;
do $$ begin
 begin
 perform public.hm_submit_enquiry('Synthetic','personal','Participant initiates','','','hm-privacy-v1',true,gen_random_uuid());
 raise exception 'Expired pilot intake allowed';
 exception when raise_exception then if sqlerrm not like 'The congregation pilot is awaiting review.%' then raise;end if;
 end;
end $$;
reset role;
do $$ begin
 if not exists(select from public.hm_cases where id=current_setting('test.pilot_case')::uuid) then raise exception 'Record deleted';end if;
 if has_table_privilege('authenticated','marriages_private.pilot_settings','SELECT') then raise exception 'Private settings exposed';end if;
 if has_function_privilege('anon','public.hm_pilot_info()','EXECUTE') then raise exception 'Anonymous access';end if;
end $$;
rollback;
\echo PASS pilot dates, closure review, expired intake denial, retained records and private settings
