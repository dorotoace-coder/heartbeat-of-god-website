-- Thirty-day manual review schedule. No automatic purge or staff promotion.
begin;
create table marriages_private.pilot_settings (
 singleton boolean primary key default true check(singleton),
 started_on date not null default ((now() at time zone 'America/Winnipeg')::date),
 review_on date not null default (((now() at time zone 'America/Winnipeg')::date)+30),
 check(review_on>started_on)
);
alter table marriages_private.pilot_settings enable row level security;
revoke all on marriages_private.pilot_settings from public,anon,authenticated;
insert into marriages_private.pilot_settings(singleton) values(true);
alter table marriages_private.enquiries add column review_on date;
create function marriages_private.pilot_enquiry_review() returns trigger language plpgsql security definer set search_path='' as $$
declare due date;
begin
 select review_on into due from marriages_private.pilot_settings where singleton;
 if (now() at time zone 'America/Winnipeg')::date>=due then raise exception 'The congregation pilot is awaiting review. Please contact Pastor Amos directly.';end if;
 new.review_on:=due;return new;
end; $$;
revoke all on function marriages_private.pilot_enquiry_review() from public,anon,authenticated;
create trigger hm_enquiry_review before insert on marriages_private.enquiries for each row execute function marriages_private.pilot_enquiry_review();
create function marriages_private.pilot_case_review() returns trigger language plpgsql security definer set search_path='' as $$
declare due date;
begin
 select review_on into due from marriages_private.pilot_settings where singleton;
 if tg_op='INSERT' then
 insert into marriages_private.retention_reviews(case_id,review_on,rationale) values(new.id,due,'Pilot review due; necessity and any continuation require human review.');
 elsif new.status='closed' and old.status is distinct from new.status then
 update marriages_private.retention_reviews set review_on=least(coalesce(review_on,due),(now() at time zone 'America/Winnipeg')::date),updated_at=now() where case_id=new.id;
 end if;
 return new;
end; $$;
revoke all on function marriages_private.pilot_case_review() from public,anon,authenticated;
create trigger hm_case_review after insert or update of status on public.hm_cases for each row execute function marriages_private.pilot_case_review();
create function marriages_private.hm_pilot_info() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return (select jsonb_build_object('started_on',started_on,'review_on',review_on) from marriages_private.pilot_settings where singleton);
end; $$;
create function public.hm_pilot_info() returns jsonb language sql stable security invoker set search_path='' as $$ select marriages_private.hm_pilot_info(); $$;
revoke all on function marriages_private.hm_pilot_info(),public.hm_pilot_info() from public,anon;
grant execute on function marriages_private.hm_pilot_info(),public.hm_pilot_info() to authenticated;
notify pgrst,'reload schema';
commit;
