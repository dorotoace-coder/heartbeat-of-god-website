begin;

alter table public.outreach_contacts add column closure_outcome text
  check (closure_outcome in ('completed', 'declined'));
update public.outreach_contacts set closure_outcome = 'completed'
  where completed_at is not null;
alter table public.outreach_contacts add constraint outreach_closure_matches_time
  check ((completed_at is null) = (closure_outcome is null));

create table public.outreach_followup_events (
  id uuid primary key,
  contact_id uuid not null references public.outreach_contacts(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  outcome text not null check (outcome in ('no_answer', 'conversation', 'completed', 'declined', 'handoff')),
  note text not null check (length(trim(note)) between 1 and 500),
  next_due date,
  assigned_to uuid references public.outreach_workers(user_id),
  occurred_at timestamptz not null default now(),
  check ((outcome = 'handoff') = (assigned_to is not null))
);
create index outreach_followup_events_contact_time
  on public.outreach_followup_events(contact_id, occurred_at desc);
alter table public.outreach_followup_events enable row level security;
revoke all on public.outreach_followup_events from public, anon, authenticated;
grant select on public.outreach_followup_events to authenticated;
create policy outreach_followup_read on public.outreach_followup_events
  for select to authenticated using (
    exists (select 1 from public.outreach_contacts c where c.id = contact_id)
  );

create function public.record_outreach_followup(
  p_id uuid, p_contact uuid, p_outcome text, p_note text, p_next_due date, p_worker uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare contact public.outreach_contacts;
begin
  if p_id is null or p_contact is null then raise exception 'Choose a follow-up'; end if;
  if exists (
    select 1 from public.outreach_followup_events
    where id = p_id and contact_id = p_contact and actor_id = auth.uid()
      and outcome = p_outcome and note = trim(p_note)
      and next_due is not distinct from p_next_due
      and assigned_to is not distinct from p_worker
  ) then return; end if;
  select * into contact from public.outreach_contacts where id = p_contact for update;
  if not found or contact.followup_date is null or contact.completed_at is not null or
     not (public.staff_workspace() = 'pastor' or
       (public.staff_workspace() = 'evangelism' and contact.assigned_to = auth.uid())) then
    raise exception 'Follow-up unavailable' using errcode = '42501';
  end if;
  if p_outcome is null or p_outcome not in ('no_answer', 'conversation', 'completed', 'declined', 'handoff') or
     length(trim(coalesce(p_note, ''))) not between 1 and 500 then
    raise exception 'Choose an outcome and enter a note';
  end if;
  if p_outcome in ('no_answer', 'conversation', 'handoff') and
     (p_next_due is null or p_next_due < current_date) then
    raise exception 'Choose the next follow-up date';
  end if;
  if p_outcome in ('completed', 'declined') and p_next_due is not null then
    raise exception 'A closed follow-up has no next date';
  end if;
  if p_outcome = 'handoff' then
    if p_worker is null or p_worker = contact.assigned_to or
       not exists (select 1 from public.outreach_workers where user_id = p_worker) then
      raise exception 'Choose another outreach worker';
    end if;
  elsif p_worker is not null then
    raise exception 'A worker is only needed for a handoff';
  end if;
  update public.outreach_contacts set
    followup_date = case when p_outcome in ('completed', 'declined') then followup_date else p_next_due end,
    assigned_to = case when p_outcome = 'handoff' then p_worker else assigned_to end,
    completed_at = case when p_outcome in ('completed', 'declined') then now() else null end,
    closure_outcome = case when p_outcome in ('completed', 'declined') then p_outcome else null end
  where id = p_contact;
  insert into public.outreach_followup_events
    (id, contact_id, actor_id, outcome, note, next_due, assigned_to)
  values (p_id, p_contact, auth.uid(), p_outcome, trim(p_note), p_next_due, p_worker);
end $$;
revoke all on function public.record_outreach_followup(uuid,uuid,text,text,date,uuid) from public, anon, authenticated;
grant execute on function public.record_outreach_followup(uuid,uuid,text,text,date,uuid) to authenticated;

-- Older browser tabs can still finish their in-flight actions; record those too.
create or replace function public.complete_outreach_followup(p_contact uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare contact public.outreach_contacts;
begin
  select * into contact from public.outreach_contacts where id = p_contact for update;
  if not found or contact.followup_date is null or
    not (public.staff_workspace() = 'pastor' or
         (public.staff_workspace() = 'evangelism' and contact.assigned_to = auth.uid())) then
    raise exception 'Follow-up unavailable' using errcode = '42501';
  end if;
  if contact.completed_at is not null then return; end if;
  update public.outreach_contacts set completed_at = now(), closure_outcome = 'completed' where id = p_contact;
  insert into public.outreach_followup_events(id,contact_id,actor_id,outcome,note)
  values (gen_random_uuid(),p_contact,auth.uid(),'completed','Completed without a note.');
end $$;

create or replace function public.assign_outreach_followup(p_contact uuid,p_worker uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare due date;
begin
  if not exists(select 1 from public.outreach_workers where user_id = p_worker) then
    raise exception 'Choose an outreach worker';
  end if;
  update public.outreach_contacts set assigned_to = p_worker
  where id = p_contact and followup_date is not null and completed_at is null and assigned_to is distinct from p_worker and
    (public.staff_workspace() = 'pastor' or
     (public.staff_workspace() = 'evangelism' and assigned_to = auth.uid()))
  returning followup_date into due;
  if not found then raise exception 'Follow-up unavailable' using errcode = '42501'; end if;
  insert into public.outreach_followup_events(id,contact_id,actor_id,outcome,note,next_due,assigned_to)
  values (gen_random_uuid(),p_contact,auth.uid(),'handoff','Handed over without a note.',due,p_worker);
end $$;

commit;
