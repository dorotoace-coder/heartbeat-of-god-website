begin;
create table public.training_placements (
 id uuid primary key default gen_random_uuid(),
 learner_id uuid not null references public.training_learners,
 stage text not null check(stage in ('foundation','discipleship','minister','deacon','pastoral')),
 mentor_id uuid not null references auth.users,
 supervisor_id uuid not null references auth.users,
 assignment text not null check(length(trim(assignment)) between 5 and 1000),
 review_on date not null,
 created_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now()
);
create index training_placements_learner on public.training_placements(learner_id);
create index training_placements_mentor on public.training_placements(mentor_id);
create index training_placements_supervisor on public.training_placements(supervisor_id);
create table public.training_observations (
 id uuid primary key default gen_random_uuid(),
 placement_id uuid not null references public.training_placements,
 feedback text not null check(length(trim(feedback)) between 5 and 2000),
 created_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now()
);
create index training_observations_placement on public.training_observations(placement_id);
create table public.training_formation_reviews (
 id uuid primary key default gen_random_uuid(),
 placement_id uuid not null references public.training_placements,
 outcome text not null check(outcome in ('continue','further_preparation','ready_for_consideration')),
 next_step text not null check(length(trim(next_step)) between 5 and 2000),
 created_by uuid not null default auth.uid() references auth.users,
 created_at timestamptz not null default now()
);
create index training_formation_reviews_placement on public.training_formation_reviews(placement_id);
alter table public.training_placements enable row level security;
alter table public.training_observations enable row level security;
alter table public.training_formation_reviews enable row level security;
revoke all on public.training_placements,public.training_observations,public.training_formation_reviews from public,anon,authenticated;
grant select,insert on public.training_placements,public.training_observations,public.training_formation_reviews to authenticated;
create policy placement_read on public.training_placements for select to authenticated using
(training_private.is_pastor() or mentor_id=auth.uid() or supervisor_id=auth.uid() or training_private.owns(learner_id));
create policy placement_create on public.training_placements for insert to authenticated with check
(training_private.is_pastor() and created_by=auth.uid() and exists(select 1 from public.training_learners l where l.id=learner_id and l.active));
create policy observation_read on public.training_observations for select to authenticated using
(exists(select 1 from public.training_placements p where p.id=placement_id));
create policy observation_create on public.training_observations for insert to authenticated with check
(created_by=auth.uid() and exists(select 1 from public.training_placements p where p.id=placement_id and
(training_private.is_pastor() or p.mentor_id=auth.uid() or p.supervisor_id=auth.uid())));
create policy formation_review_read on public.training_formation_reviews for select to authenticated using
(exists(select 1 from public.training_placements p where p.id=placement_id));
create policy formation_review_create on public.training_formation_reviews for insert to authenticated with check
(training_private.is_pastor() and created_by=auth.uid());
commit;
