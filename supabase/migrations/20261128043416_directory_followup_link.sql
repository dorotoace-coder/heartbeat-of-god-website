-- Link ministry follow-ups to program directory contacts.
-- One open follow-up per contact; contacts who asked for no further contact,
-- or whose details need review, cannot be linked. Existing manual follow-ups
-- and the previous seven-argument call keep working.
begin;

-- The directory table already exists in the hosted project (created with its
-- reviewed import). This schema-only block lets a fresh local setup build it.
-- It does nothing when the table exists. No contact data belongs here.
do $$ begin
 if to_regclass('public.program_outreach_directory') is null then
  create table public.program_outreach_directory (
   import_key text primary key,
   display_name text not null,
   email text not null,
   phone_original text not null default '',
   programs jsonb not null,
   review_flags jsonb not null,
   provenance jsonb not null,
   email_permission text not null default 'unknown'
    check (email_permission in ('unknown','subscribed','unsubscribed')),
   imported_at timestamptz not null default now()
  );
  alter table public.program_outreach_directory enable row level security;
  revoke all on public.program_outreach_directory from public, anon, authenticated;
  grant select on public.program_outreach_directory to authenticated;
  create policy program_directory_pastor_read on public.program_outreach_directory for select to authenticated
   using (exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='owner'));
 end if;
end $$;

alter table public.ministry_followup_requests
 add column directory_import_key text
 references public.program_outreach_directory(import_key) on update cascade;

create unique index ministry_followup_one_open_per_directory_contact
 on public.ministry_followup_requests(directory_import_key)
 where completed_at is null and directory_import_key is not null;
create index ministry_followup_directory_history
 on public.ministry_followup_requests(directory_import_key)
 where directory_import_key is not null;

drop function public.create_ministry_followup(uuid,text,text,text,date,uuid,boolean);
create function public.create_ministry_followup(
  p_id uuid,p_name text,p_phone text,p_kind text,p_due date,p_worker uuid,p_permission boolean,
  p_directory_key text default null
) returns void language plpgsql security definer set search_path='' as $$
declare
  workspace text := public.staff_workspace();
  existing public.ministry_followup_requests;
  contact record;
begin
  if auth.uid() is null or coalesce(workspace,'') not in ('pastor','evangelism') or
     (workspace <> 'pastor' and p_worker is distinct from auth.uid()) then
    raise exception 'Follow-up access required' using errcode='42501';
  end if;
  -- Same rule as reading the directory: only the owner account may link to it.
  if p_directory_key is not null and
     not exists(select 1 from public.profiles where id=auth.uid() and role='owner') then
    raise exception 'Directory access required' using errcode='42501';
  end if;
  if p_id is null or length(trim(coalesce(p_name,''))) not between 1 and 160 or
     length(coalesce(p_phone,''))>80 or p_kind is null or p_kind not in ('visitor','ministry') or
     p_due is null or p_permission is distinct from true or
     (p_worker is not null and not exists(select 1 from public.outreach_workers where user_id=p_worker)) then
    raise exception 'Check the follow-up details';
  end if;
  select * into existing from public.ministry_followup_requests where id=p_id;
  if found then
    if existing.recorded_by=auth.uid() and existing.full_name=trim(p_name) and
       existing.phone is not distinct from nullif(trim(p_phone),'') and existing.kind=p_kind and
       existing.followup_date=p_due and existing.assigned_to is not distinct from p_worker and
       existing.directory_import_key is not distinct from p_directory_key and
       existing.completed_at is null then return; end if;
    raise exception 'Request identifier already used' using errcode='23505';
  end if;
  if p_due < (now() at time zone 'Africa/Lagos')::date then raise exception 'Choose a current or future date'; end if;
  if p_directory_key is not null then
    select c.display_name, c.relationship into contact
      from public.program_directory_current() c where c.import_key=p_directory_key;
    if not found or trim(contact.display_name) <> trim(p_name) then
      raise exception 'Directory contact changed' using errcode='HB003';
    end if;
    if contact.relationship='review' then
      raise exception 'Directory contact needs review' using errcode='HB002';
    end if;
    if exists(select 1 from public.ministry_followup_requests
       where directory_import_key=p_directory_key and closure_outcome='declined') then
      raise exception 'Contact asked for no further contact' using errcode='HB004';
    end if;
    if exists(select 1 from public.ministry_followup_requests
       where directory_import_key=p_directory_key and completed_at is null) then
      raise exception 'An open follow-up already exists for this contact' using errcode='HB001';
    end if;
  end if;
  begin
    insert into public.ministry_followup_requests(id,kind,full_name,phone,contact_permission,followup_date,assigned_to,recorded_by,directory_import_key)
    values(p_id,p_kind,trim(p_name),nullif(trim(p_phone),''),true,p_due,p_worker,auth.uid(),p_directory_key);
  exception when unique_violation then
    -- A simultaneous save for the same contact reached the index first.
    if p_directory_key is not null and exists(select 1 from public.ministry_followup_requests
       where directory_import_key=p_directory_key and completed_at is null and id<>p_id) then
      raise exception 'An open follow-up already exists for this contact' using errcode='HB001';
    end if;
    raise;
  end;
end $$;
revoke all on function public.create_ministry_followup(uuid,text,text,text,date,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.create_ministry_followup(uuid,text,text,text,date,uuid,boolean,text) to authenticated;
commit;
