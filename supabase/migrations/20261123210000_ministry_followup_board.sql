begin;

-- Visitor/ministry requests complement existing outreach contacts; no automatic imports.
create table public.ministry_followup_requests (
  id uuid primary key,
  kind text not null check (kind in ('visitor','ministry')),
  full_name text not null check (length(trim(full_name)) between 1 and 160),
  phone text check (length(phone) <= 80),
  contact_permission boolean not null check (contact_permission),
  followup_date date not null,
  assigned_to uuid references public.outreach_workers(user_id),
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  closure_outcome text check (closure_outcome in ('completed','declined')),
  check ((completed_at is null) = (closure_outcome is null))
);
create index ministry_followup_assignee_due on public.ministry_followup_requests(assigned_to,followup_date);
create table public.ministry_followup_events (
  id uuid primary key,
  contact_id uuid not null references public.ministry_followup_requests(id),
  actor_id uuid not null references auth.users(id),
  outcome text not null check (outcome in ('no_answer','conversation','completed','declined','handoff')),
  note text not null check (length(trim(note)) between 1 and 500),
  next_due date,
  assigned_to uuid references public.outreach_workers(user_id),
  occurred_at timestamptz not null default now(),
  check ((outcome = 'handoff') = (assigned_to is not null)),
  check ((outcome in ('completed','declined')) = (next_due is null))
);
create index ministry_followup_events_contact_time on public.ministry_followup_events(contact_id,occurred_at desc);
alter table public.ministry_followup_requests enable row level security;
alter table public.ministry_followup_events enable row level security;
revoke all on public.ministry_followup_requests,public.ministry_followup_events from public,anon,authenticated;
grant select on public.ministry_followup_requests,public.ministry_followup_events to authenticated;
create policy ministry_followup_read on public.ministry_followup_requests for select to authenticated using (
  public.staff_workspace() = 'pastor' or
  (public.staff_workspace() = 'evangelism' and assigned_to = (select auth.uid()))
);
create policy ministry_followup_history_read on public.ministry_followup_events for select to authenticated using (
  exists(select 1 from public.ministry_followup_requests r where r.id=contact_id)
);

-- Definer rights allow validated writes while denying direct client mutations.
create function public.create_ministry_followup(
  p_id uuid,p_name text,p_phone text,p_kind text,p_due date,p_worker uuid,p_permission boolean
) returns void language plpgsql security definer set search_path='' as $$
declare workspace text := public.staff_workspace(); existing public.ministry_followup_requests;
begin
  if auth.uid() is null or coalesce(workspace,'') not in ('pastor','evangelism') or
     (workspace <> 'pastor' and p_worker is distinct from auth.uid()) then
    raise exception 'Follow-up access required' using errcode='42501';
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
       existing.followup_date=p_due and existing.assigned_to is not distinct from p_worker and existing.completed_at is null then return; end if;
    raise exception 'Request identifier already used' using errcode='23505';
  end if;
  if p_due < (now() at time zone 'Africa/Lagos')::date then raise exception 'Choose a current or future date'; end if;
  insert into public.ministry_followup_requests(id,kind,full_name,phone,contact_permission,followup_date,assigned_to,recorded_by)
  values(p_id,p_kind,trim(p_name),nullif(trim(p_phone),''),true,p_due,p_worker,auth.uid());
end $$;

create function public.record_ministry_followup(
  p_id uuid,p_contact uuid,p_outcome text,p_note text,p_next_due date,p_worker uuid
) returns void language plpgsql security definer set search_path='' as $$
declare request public.ministry_followup_requests; workspace text := public.staff_workspace();
begin
  if auth.uid() is null or coalesce(workspace,'') not in ('pastor','evangelism') then
    raise exception 'Follow-up access required' using errcode='42501';
  end if;
  select * into request from public.ministry_followup_requests where id=p_contact for update;
  if not found or not (workspace='pastor' or request.assigned_to=auth.uid()) or
     (workspace<>'pastor' and request.assigned_to is null) then
    raise exception 'Follow-up unavailable' using errcode='42501';
  end if;
  -- Retry only an exact previously confirmed event; never overwrite its contents.
  if exists(select 1 from public.ministry_followup_events where id=p_id and contact_id=p_contact and actor_id=auth.uid()
    and outcome=p_outcome and note=trim(p_note) and next_due is not distinct from p_next_due
    and assigned_to is not distinct from p_worker) then return; end if;
  if request.completed_at is not null then raise exception 'Follow-up is closed'; end if;
  if p_id is null or p_outcome is null or p_outcome not in ('no_answer','conversation','completed','declined','handoff') or
     length(trim(coalesce(p_note,''))) not between 1 and 500 then raise exception 'Choose an outcome and enter a note'; end if;
  if p_outcome in ('no_answer','conversation','handoff') and
     (p_next_due is null or p_next_due<(now() at time zone 'Africa/Lagos')::date) then raise exception 'Choose the next date'; end if;
  if p_outcome in ('completed','declined') and p_next_due is not null then raise exception 'Closed requests have no next date'; end if;
  if p_outcome='handoff' then
    if p_worker is null or p_worker is not distinct from request.assigned_to or
       not exists(select 1 from public.outreach_workers where user_id=p_worker) then raise exception 'Choose another worker'; end if;
  elsif p_worker is not null then raise exception 'Worker is only used for a handoff'; end if;
  update public.ministry_followup_requests set
    followup_date=coalesce(p_next_due,followup_date),
    assigned_to=case when p_outcome='handoff' then p_worker else assigned_to end,
    completed_at=case when p_outcome in ('completed','declined') then now() else null end,
    closure_outcome=case when p_outcome in ('completed','declined') then p_outcome else null end
  where id=p_contact;
  insert into public.ministry_followup_events(id,contact_id,actor_id,outcome,note,next_due,assigned_to)
    values(p_id,p_contact,auth.uid(),p_outcome,trim(p_note),p_next_due,p_worker);
end $$;
revoke all on function public.create_ministry_followup(uuid,text,text,text,date,uuid,boolean),
  public.record_ministry_followup(uuid,uuid,text,text,date,uuid) from public,anon,authenticated;
grant execute on function public.create_ministry_followup(uuid,text,text,text,date,uuid,boolean),
  public.record_ministry_followup(uuid,uuid,text,text,date,uuid) to authenticated;
commit;
