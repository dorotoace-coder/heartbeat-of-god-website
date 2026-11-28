-- Identity linking C4, part 1: who agreed to which ministry messages.
-- An append-only log keyed by email address and purpose. Nothing here sends
-- anything. Registering for an event or being a member never counts as permission.
-- Partnership reminders keep their own opt-in (partnership_commitments.updates_opt_in).
begin;

create table public.contact_permissions (
 id bigint generated always as identity primary key,
 request_id uuid not null,
 address text not null check (address = lower(trim(address)) and position('@' in address) > 1 and length(address) <= 254),
 channel text not null default 'email' check (channel = 'email'),
 purpose text not null check (purpose in ('event_invitation','ministry_news','greetings')),
 decision text not null check (decision in ('granted','withdrawn')),
 method text not null check (method in ('in_person','reply_message','signed_form','owner_recorded')),
 wording text check (wording is null or length(wording) between 10 and 500),
 note text check (note is null or length(note) between 1 and 300),
 person_id uuid references public.congregation_people(id),
 recorded_by uuid not null references auth.users(id),
 recorded_at timestamptz not null default now(),
 unique (request_id, purpose),
 -- A grant must say how it was given and what the person was asked.
 check (decision = 'withdrawn' or (method in ('in_person','reply_message','signed_form') and wording is not null))
);
create index contact_permissions_lookup on public.contact_permissions(address, purpose, recorded_at desc, id desc);

alter table public.contact_permissions enable row level security;
revoke all on public.contact_permissions from public, anon, authenticated;
grant select on public.contact_permissions to authenticated;
create policy contact_permissions_owner_read on public.contact_permissions for select to authenticated
 using (exists(select 1 from public.profiles where id=(select auth.uid()) and role='owner'));

-- Record a decision for one address and one or more purposes. Retry safe by request id.
create function public.permission_record(
 p_request uuid, p_address text, p_purposes text[], p_decision text, p_method text,
 p_wording text, p_note text, p_person uuid, p_identity_checked boolean
) returns void language plpgsql security definer set search_path='' as $$
declare email text := lower(trim(p_address)); clean_wording text := nullif(trim(p_wording),''); clean_note text := nullif(trim(p_note),'');
 existing int;
begin
 perform public.require_person_owner();
 select count(*) into existing from public.contact_permissions where request_id=p_request;
 if existing > 0 then
  if existing = cardinality(p_purposes) and not exists(
    select 1 from public.contact_permissions c where c.request_id=p_request and (
     c.address<>email or c.decision<>p_decision or c.method<>p_method or c.wording is distinct from clean_wording
     or c.note is distinct from clean_note or c.person_id is distinct from p_person or c.recorded_by<>auth.uid()
     or not c.purpose=any(p_purposes))) then
   return;
  end if;
  raise exception 'Request identifier already used' using errcode='23505';
 end if;
 if p_request is null or email is null or position('@' in email) < 2 or length(email) > 254
    or p_purposes is null or cardinality(p_purposes) not between 1 and 3
    or not p_purposes <@ array['event_invitation','ministry_news','greetings']::text[]
    or (select count(distinct x) from unnest(p_purposes) x) <> cardinality(p_purposes)
    or p_decision is null or p_decision not in ('granted','withdrawn')
    or p_method is null or p_method not in ('in_person','reply_message','signed_form','owner_recorded')
    or length(coalesce(clean_note,'')) > 300 then
  raise exception 'Check the address, purposes and how this was given' using errcode='HB021';
 end if;
 if p_decision='granted' and (p_identity_checked is distinct from true or p_method='owner_recorded'
    or clean_wording is null or length(clean_wording) not between 10 and 500) then
  raise exception 'A permission needs the question asked, how they agreed, and an identity check' using errcode='HB022';
 end if;
 if p_person is not null and not exists(select 1 from public.congregation_people where id=p_person) then
  raise exception 'Person not found' using errcode='HB012';
 end if;
 insert into public.contact_permissions(request_id,address,purpose,decision,method,wording,note,person_id,recorded_by)
 select p_request, email, purpose, p_decision, p_method, clean_wording, clean_note, p_person, auth.uid()
 from unnest(p_purposes) purpose;
end $$;

-- Current decision per address and purpose. Unknown stays unknown.
-- allowed is true only for a grant with no later withdrawal and no suppression.
create function public.permission_status(p_addresses text[])
returns table(address text, purpose text, decision text, method text, recorded_at timestamptz, suppressed boolean, allowed boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.require_person_owner();
 if p_addresses is null or cardinality(p_addresses) > 500 then raise exception 'Up to 500 addresses' using errcode='HB021'; end if;
 return query
 with wanted as (select distinct lower(trim(a)) as address from unnest(p_addresses) a),
 latest as (
  select distinct on (c.address, c.purpose) c.address, c.purpose, c.decision, c.method, c.recorded_at
  from public.contact_permissions c join wanted w on w.address=c.address
  order by c.address, c.purpose, c.recorded_at desc, c.id desc
 )
 select w.address, p.purpose, l.decision, l.method, l.recorded_at,
  exists(select 1 from public.email_suppressions s where s.email=w.address),
  coalesce(l.decision='granted', false) and not exists(select 1 from public.email_suppressions s where s.email=w.address)
 from wanted w cross join unnest(array['event_invitation','ministry_news','greetings']) as p(purpose)
 left join latest l on l.address=w.address and l.purpose=p.purpose
 order by w.address, p.purpose;
end $$;

revoke all on function public.permission_record(uuid,text,text[],text,text,text,text,uuid,boolean), public.permission_status(text[])
 from public, anon, authenticated;
grant execute on function public.permission_record(uuid,text,text[],text,text,text,text,uuid,boolean), public.permission_status(text[])
 to authenticated;
commit;
