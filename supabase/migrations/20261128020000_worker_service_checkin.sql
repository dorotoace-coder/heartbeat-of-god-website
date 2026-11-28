begin;
create table public.worker_service_checkins (
 learner_id uuid not null references public.training_learners,
 service_id uuid not null references public.pulse_services,
 arrived_at timestamptz not null,
 note text not null default '' check(length(note)<=500),
 recorded_by uuid not null default auth.uid() references auth.users,
 recorded_at timestamptz not null default now(),
 primary key(learner_id,service_id)
);
alter table public.worker_service_checkins enable row level security;
revoke all on public.worker_service_checkins from public,anon,authenticated;
grant select,insert,update on public.worker_service_checkins to authenticated;
create policy worker_checkin_read on public.worker_service_checkins for select to authenticated using
(training_private.is_pastor() or training_private.owns(learner_id));
create policy worker_checkin_insert on public.worker_service_checkins for insert to authenticated with check
(training_private.is_pastor() and recorded_by=auth.uid());
create policy worker_checkin_update on public.worker_service_checkins for update to authenticated using
(training_private.is_pastor()) with check(training_private.is_pastor() and recorded_by=auth.uid());
commit;

insert into public.departments(name,description,what_they_do,who_should_join,cta_text,display_order)
select 'Children’s Church','Help children know Jesus through Bible stories, prayer and age-appropriate activities.',
'Teachers prepare a shared Bible lesson, adapt activities for different ages and partner with caregivers.',
'Workers willing to complete teacher training, supervised practice and the ministry’s child-protection approvals.',
'Express interest',20
where not exists(select 1 from public.departments where lower(coalesce(name,'')) like '%children%');
