begin;

-- Training adds no operational permissions to existing ministry workspaces.
create table public.training_learners (
 id uuid primary key default gen_random_uuid(),
 user_id uuid unique references auth.users,
 person_id uuid unique references public.congregation_people,
 display_name text not null check(length(trim(display_name)) between 1 and 160),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 check(user_id is not null or person_id is not null)
);
create table public.training_editors (
 user_id uuid not null references auth.users,
 module_id text not null,
 primary key(user_id,module_id)
);
create table public.training_modules (
 id text not null check(id ~ '^[a-z][a-z0-9-]{0,59}$'),
 revision integer not null check(revision > 0),
 status text not null default 'draft' check(status in ('draft','in_review','published','archived')),
 department_id uuid references public.departments,
 content jsonb not null check(jsonb_typeof(content)='object'),
 updated_by uuid not null default auth.uid() references auth.users,
 updated_at timestamptz not null default now(),
 published_by uuid references auth.users,
 published_at timestamptz,
 primary key(id,revision),
 check(status <> 'published' or (published_by is not null and published_at is not null))
);
create unique index training_one_published on public.training_modules(id) where status='published';
create table public.training_enrolments (
 learner_id uuid not null references public.training_learners,
 module_id text not null,
 reviewer_id uuid references auth.users,
 foundation_class_id uuid references public.foundation_classes,
 primary key(learner_id,module_id)
);
create index training_reviewer on public.training_enrolments(reviewer_id,learner_id);
create table public.training_progress (
 learner_id uuid not null,
 module_id text not null,
 revision integer not null,
 read_lesson_ids text[] not null default '{}',
 quiz_correct integer not null default 0,
 quiz_total integer not null default 0,
 quiz_passed boolean not null default false,
 quiz_attempts integer not null default 0,
 attendance_approved boolean not null default false,
 practical_approved boolean not null default false,
 approved_by uuid references auth.users,
 approved_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key(learner_id,module_id,revision),
 foreign key(learner_id,module_id) references public.training_enrolments,
 foreign key(module_id,revision) references public.training_modules,
 check((approved_by is null)=(approved_at is null))
);
create table public.training_audit (
 id bigint generated always as identity primary key,
 actor uuid not null default auth.uid() references auth.users,
 action text not null,
 module_id text not null,
 revision integer,
 learner_id uuid references public.training_learners,
 detail jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create table public.training_equivalences (
 learner_id uuid primary key references public.training_learners,
 reason text not null check(length(trim(reason)) between 20 and 1000),
 approved_by uuid not null default auth.uid() references auth.users,
 approved_at timestamptz not null default now()
);

-- Helpers are kept outside the Data API. Every privileged write checks the actor.
create schema if not exists training_private;
revoke all on schema training_private from public,anon;
grant usage on schema training_private to authenticated;
create function training_private.is_pastor() returns boolean language sql stable
security definer set search_path='' as $$
 select auth.uid() is not null and coalesce(public.staff_workspace()='pastor',false);
$$;
create function training_private.can_edit(p_module text) returns boolean language sql stable
security definer set search_path='' as $$
 select training_private.is_pastor() or exists(select 1 from public.training_editors where user_id=auth.uid() and module_id=p_module);
$$;
create function training_private.can_read() returns boolean language sql stable
security definer set search_path='' as $$
 select training_private.is_pastor() or exists(select 1 from public.training_learners where user_id=auth.uid() and active)
 or exists(select 1 from public.training_editors where user_id=auth.uid())
 or exists(select 1 from public.training_enrolments where reviewer_id=auth.uid());
$$;
create function training_private.can_review(p_learner uuid,p_module text) returns boolean language sql stable
security definer set search_path='' as $$
 select training_private.is_pastor() or exists(select 1 from public.training_enrolments e where e.learner_id=p_learner and e.module_id=p_module and e.reviewer_id=auth.uid());
$$;
create function training_private.owns(p_learner uuid) returns boolean language sql stable
security definer set search_path='' as $$
 select exists(select 1 from public.training_learners where id=p_learner and user_id=auth.uid() and active);
$$;
revoke all on all functions in schema training_private from public,anon;
grant execute on all functions in schema training_private to authenticated;

do $$ declare t text; begin
 foreach t in array array['training_learners','training_editors','training_modules','training_enrolments','training_progress','training_audit','training_equivalences'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy training_people_read on public.training_learners for select to authenticated using
 (training_private.is_pastor() or user_id=auth.uid() or exists(select 1 from public.training_enrolments e where e.learner_id=id and e.reviewer_id=auth.uid()));
create policy training_editors_read on public.training_editors for select to authenticated using(user_id=auth.uid() or training_private.is_pastor());
create policy training_library_read on public.training_modules for select to authenticated using
 (training_private.can_edit(id) or (status='published' and training_private.can_read()));
create policy training_enrolment_read on public.training_enrolments for select to authenticated using
 (training_private.owns(learner_id) or training_private.can_review(learner_id,module_id));
create policy training_progress_read on public.training_progress for select to authenticated using
 (training_private.owns(learner_id) or training_private.can_review(learner_id,module_id));
create policy training_audit_read on public.training_audit for select to authenticated using(training_private.is_pastor());
create policy training_equivalence_read on public.training_equivalences for select to authenticated using
 (training_private.owns(learner_id) or training_private.is_pastor());

create function public.training_access() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin if current_user='anon' or auth.uid() is null then return jsonb_build_object('allowed',false,'pastor',false); end if; return jsonb_build_object('allowed',training_private.can_read(),'pastor',training_private.is_pastor()); end;
$$;

create function training_private.training_save_module(p_id text,p_revision integer,p_content jsonb,p_expected_at timestamptz default null)
returns void language plpgsql security definer set search_path='' as $$
declare current_row public.training_modules; next_revision integer;
begin
 if not training_private.can_edit(p_id) then raise exception 'Editor access required' using errcode='42501'; end if;
 if p_content->>'id' is distinct from p_id or coalesce(p_content->>'title','')='' or
 jsonb_typeof(p_content->'lessons') is distinct from 'array' or jsonb_array_length(p_content->'lessons')<1 then
 raise exception 'A valid module with lessons is required'; end if;
 perform pg_advisory_xact_lock(hashtext('training:'||p_id));
 select * into current_row from public.training_modules where id=p_id and revision=p_revision for update;
 if found and current_row.status in ('draft','in_review') then
   if p_expected_at is null or current_row.updated_at<>p_expected_at then raise exception 'This draft changed. Reload before saving.'; end if;
   update public.training_modules set content=p_content,department_id=(p_content->>'departmentId')::uuid,status='draft',updated_by=auth.uid(),updated_at=clock_timestamp() where id=p_id and revision=p_revision;
   next_revision=p_revision;
 else
   if p_revision<>0 and (current_row.id is null or p_expected_at is null or current_row.updated_at<>p_expected_at) then raise exception 'This revision changed. Reload before editing.'; end if;
   select coalesce(max(revision),0)+1 into next_revision from public.training_modules where id=p_id;
   insert into public.training_modules(id,revision,content,department_id) values(p_id,next_revision,p_content,(p_content->>'departmentId')::uuid);
 end if;
 insert into public.training_audit(action,module_id,revision) values('draft_saved',p_id,next_revision);
end $$;

create function training_private.nonempty_text(v jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(v)='string' and length(trim(v#>>'{}'))>0,false);
$$;
create function training_private.text_list(v jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(v) is distinct from 'array' then return false; end if;
 return jsonb_array_length(v)>0 and not exists(select 1 from jsonb_array_elements(v) item where not training_private.nonempty_text(item));
end $$;
revoke all on function training_private.nonempty_text(jsonb),training_private.text_list(jsonb) from public,anon,authenticated;

create function training_private.validate_content(c jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare l jsonb; q jsonb; item jsonb; name text;
begin
 if jsonb_typeof(c) is distinct from 'object' or length(trim(coalesce(c->>'title','')))=0 or length(trim(coalesce(c->>'summary','')))=0 then return false; end if;
 foreach name in array array['lessons','scripts','drills','quiz','standards'] loop
 if jsonb_typeof(c->name) is distinct from 'array' or jsonb_array_length(c->name)=0 then return false; end if;
 end loop;
 if not training_private.nonempty_text(c->'title') or not training_private.nonempty_text(c->'summary') or not training_private.text_list(c->'standards') then return false; end if;
 if jsonb_array_length(c->'scripts')<5 or jsonb_array_length(c->'quiz')<>3 then return false; end if;
 if (select count(distinct value->>'id') from jsonb_array_elements(c->'lessons'))<>jsonb_array_length(c->'lessons') then return false; end if;
 foreach name in array array['duties','boundaries'] loop
 if jsonb_typeof(c->'role'->name) is distinct from 'array' or jsonb_array_length(c->'role'->name)=0 then return false; end if;
 end loop;
 if not training_private.text_list(c->'role'->'duties') or not training_private.text_list(c->'role'->'boundaries') or not training_private.nonempty_text(c->'role'->'reportsTo') then return false; end if;
 foreach name in array array['before','after'] loop
 if jsonb_typeof(c->'checklist'->name) is distinct from 'array' or jsonb_array_length(c->'checklist'->name)=0 then return false; end if;
 end loop;
 if not training_private.text_list(c->'checklist'->'before') or not training_private.text_list(c->'checklist'->'after') then return false; end if;
 for l in select value from jsonb_array_elements(c->'lessons') loop
 foreach name in array array['id','title','objective','reflection'] loop
 if not training_private.nonempty_text(l->name) then return false; end if;
 end loop;
 if not training_private.text_list(l->'paragraphs') or (l ? 'sourceNote' and jsonb_typeof(l->'sourceNote') is distinct from 'string') then return false; end if;
 if coalesce(l->>'id','')='' or coalesce(l->>'title','')='' or coalesce(l->>'objective','')='' or coalesce(l->>'reflection','')=''
 or jsonb_typeof(l->'paragraphs') is distinct from 'array' or jsonb_array_length(l->'paragraphs')=0
 or jsonb_typeof(l->'scripture') is distinct from 'array' or jsonb_array_length(l->'scripture')=0 then return false; end if;
 for item in select value from jsonb_array_elements(l->'scripture') loop
 if not training_private.nonempty_text(item->'reference') or not training_private.nonempty_text(item->'text') then return false; end if;
 if item->>'version' is distinct from 'KJV' or coalesce(item->>'reference','')='' or coalesce(item->>'text','')='' then return false; end if;
 end loop;
 end loop;
 for item in select value from jsonb_array_elements(c->'scripts') loop
 if not training_private.nonempty_text(item->'situation') or not training_private.nonempty_text(item->'words') then return false; end if;
 end loop;
 for item in select value from jsonb_array_elements(c->'drills') loop
 if not training_private.nonempty_text(item->'situation') or not training_private.nonempty_text(item->'wrong') or not training_private.nonempty_text(item->'right') then return false; end if;
 end loop;
 if (select count(distinct value->>'id') from jsonb_array_elements(c->'quiz'))<>3 then return false; end if;
 for q in select value from jsonb_array_elements(c->'quiz') loop
 if not training_private.nonempty_text(q->'id') or not training_private.nonempty_text(q->'question') or not training_private.nonempty_text(q->'explanation') or not training_private.text_list(q->'options') then return false; end if;
 if coalesce(q->>'id','')='' or coalesce(q->>'question','')='' or coalesce(q->>'explanation','')=''
 or jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options')<2
 or jsonb_typeof(q->'correctIndex') is distinct from 'number' or (q->>'correctIndex')::integer<0
 or (q->>'correctIndex')::integer>=jsonb_array_length(q->'options') then return false; end if;
 end loop;
 return coalesce(c->'testimony'->>'kind' in ('placeholder','approved') and training_private.nonempty_text(c->'testimony'->'text'),false);
exception when others then return false;
end $$;
revoke all on function training_private.validate_content(jsonb) from public,anon,authenticated;

create function training_private.training_publish(p_id text,p_revision integer,p_action text)
returns void language plpgsql security definer set search_path='' as $$
declare m public.training_modules; n integer;
begin
 if not training_private.can_edit(p_id) then raise exception 'Editor access required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtext('training:'||p_id));
 select * into strict m from public.training_modules where id=p_id and revision=p_revision for update;
 if p_action='submit' and m.status='draft' then
   update public.training_modules set status='in_review',updated_at=clock_timestamp() where id=p_id and revision=p_revision;
 elsif p_action='publish' and training_private.is_pastor() and m.status='in_review' then
   if not training_private.validate_content(m.content) then raise exception 'Complete all teaching, role, scripture, scripts, drills, checklists, quiz and testimony fields before publishing'; end if;
   if jsonb_array_length(coalesce(m.content->'scripts','[]'))<5 or jsonb_array_length(coalesce(m.content->'quiz','[]'))<>3
      or jsonb_array_length(coalesce(m.content->'drills','[]'))<1 then raise exception 'Complete scripts, drills and three quiz questions before publishing'; end if;
   for n in 0..2 loop
     if jsonb_typeof(m.content->'quiz'->n->'correctIndex') is distinct from 'number'
       or (m.content->'quiz'->n->>'correctIndex')::integer<0
       or (m.content->'quiz'->n->>'correctIndex')::integer>=jsonb_array_length(m.content->'quiz'->n->'options') then raise exception 'Invalid quiz answer key'; end if;
   end loop;
   update public.training_modules set status='archived' where id=p_id and status='published';
   update public.training_modules set status='published',published_by=auth.uid(),published_at=now(),updated_at=clock_timestamp() where id=p_id and revision=p_revision;
 else raise exception 'This transition is unavailable or requires pastoral approval' using errcode='42501'; end if;
 insert into public.training_audit(action,module_id,revision) values(p_action,p_id,p_revision);
end $$;

create function training_private.training_record(p_learner uuid,p_module text,p_revision integer,p_lessons text[],p_answers jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.training_modules; q jsonb; correct integer=0; total integer; clean_lessons text[]; passed boolean; result jsonb;
begin
 if not training_private.owns(p_learner) and not (training_private.can_review(p_learner,p_module) and exists(select 1 from public.training_learners where id=p_learner and user_id is null and active)) then raise exception 'Your own learner record or assigned in-person register is required' using errcode='42501'; end if;
 select * into strict m from public.training_modules where id=p_module and revision=p_revision and status='published';
 if not exists(select 1 from public.training_enrolments where learner_id=p_learner and module_id=p_module) then raise exception 'Enrolment required'; end if;
 select coalesce(array_agg(distinct l->>'id'),'{}') into clean_lessons from jsonb_array_elements(m.content->'lessons') l where l->>'id'=any(p_lessons);
 total=jsonb_array_length(m.content->'quiz');
 if p_answers is not null then
   for q in select value from jsonb_array_elements(m.content->'quiz') loop
     if p_answers->>(q->>'id')=q->>'correctIndex' then correct=correct+1; end if;
   end loop;
 end if;
 passed=p_answers is not null and total=3 and correct=total;
 insert into public.training_progress(learner_id,module_id,revision,read_lesson_ids,quiz_correct,quiz_total,quiz_passed,quiz_attempts)
 values(p_learner,p_module,p_revision,clean_lessons,correct,total,passed,case when p_answers is null then 0 else 1 end)
 on conflict(learner_id,module_id,revision) do update set
 read_lesson_ids=coalesce((select array_agg(distinct x) from unnest(public.training_progress.read_lesson_ids||excluded.read_lesson_ids) x),'{}'),
 quiz_correct=case when p_answers is null or public.training_progress.quiz_passed then public.training_progress.quiz_correct else correct end,
 quiz_total=total,quiz_passed=public.training_progress.quiz_passed or passed,
 quiz_attempts=public.training_progress.quiz_attempts+case when p_answers is null then 0 else 1 end,updated_at=clock_timestamp();
 if p_answers is not null then insert into public.training_audit(action,module_id,revision,learner_id,detail)
 values('quiz_attempt',p_module,p_revision,p_learner,jsonb_build_object('correct',correct,'total',total,'assisted',not training_private.owns(p_learner))); end if;
 select to_jsonb(p) into result from public.training_progress p where learner_id=p_learner and module_id=p_module and revision=p_revision;
 if p_answers is null then insert into public.training_audit(action,module_id,revision,learner_id,detail) values('reading_recorded',p_module,p_revision,p_learner,jsonb_build_object('lessons',clean_lessons,'assisted',not training_private.owns(p_learner))); end if;
 return result;
end $$;

create function training_private.training_review(p_learner uuid,p_module text,p_revision integer,p_attendance boolean,p_practical boolean,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare p public.training_progress; m public.training_modules; is_equivalent boolean;
begin
 if not training_private.can_review(p_learner,p_module) then raise exception 'Assigned reviewer access required' using errcode='42501'; end if;
 if exists(select 1 from public.training_learners where id=p_learner and user_id=auth.uid()) then raise exception 'A second leader must approve your assessment'; end if;
 if length(trim(coalesce(p_note,'')))<10 then raise exception 'Record assessment evidence'; end if;
 select * into strict m from public.training_modules where id=p_module and revision=p_revision and status='published';
 select * into strict p from public.training_progress where learner_id=p_learner and module_id=p_module and revision=p_revision for update;
 if not p.quiz_passed or cardinality(p.read_lesson_ids)<jsonb_array_length(m.content->'lessons') then raise exception 'Complete reading and knowledge check first'; end if;
 if p_module<>'foundation' then
   select exists(select 1 from public.training_equivalences where learner_id=p_learner) or exists(
     select 1 from public.training_progress f join public.training_modules fm on fm.id=f.module_id and fm.revision=f.revision
     where f.learner_id=p_learner and f.module_id='foundation' and f.approved_at is not null and fm.status='published') into is_equivalent;
   if not is_equivalent then raise exception 'Foundation School completion or pastoral equivalence is required'; end if;
 end if;
 update public.training_progress set attendance_approved=p_attendance,practical_approved=p_practical,
 approved_by=case when p_attendance and p_practical then auth.uid() else null end,
 approved_at=case when p_attendance and p_practical then now() else null end,updated_at=clock_timestamp()
 where learner_id=p_learner and module_id=p_module and revision=p_revision;
 insert into public.training_audit(action,module_id,revision,learner_id,detail)
 values('assessment',p_module,p_revision,p_learner,jsonb_build_object('evidence',p_note,'attendance',p_attendance,'practical',p_practical));
end $$;

create function training_private.training_enrol(p_person uuid,p_user uuid,p_name text,p_module text,p_reviewer uuid,p_class uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare learner uuid;
begin
 if not training_private.is_pastor() then raise exception 'Pastor access required' using errcode='42501'; end if;
 if p_user is not null and not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'Use an existing confirmed account'; end if;
 if p_person is null and p_user is null then raise exception 'Select an existing person or account'; end if;
 if p_class is not null and (p_person is null or not exists(select 1 from public.foundation_students where class_id=p_class and person_id=p_person)) then raise exception 'Select the student’s existing Foundation class'; end if;
 if p_person is not null then select id into learner from public.training_learners where person_id=p_person; end if;
 if learner is null and p_user is not null then select id into learner from public.training_learners where user_id=p_user; end if;
 if learner is null then
 insert into public.training_learners(user_id,person_id,display_name) values(p_user,p_person,trim(p_name)) returning id into learner;
 else
 update public.training_learners set user_id=coalesce(user_id,p_user),person_id=coalesce(person_id,p_person),active=true where id=learner
 and (user_id is null or p_user is null or user_id=p_user) and (person_id is null or p_person is null or person_id=p_person);
 if not found then raise exception 'This person is already linked to a different account'; end if;
 end if;
 insert into public.training_enrolments(learner_id,module_id,reviewer_id,foundation_class_id) values(learner,p_module,p_reviewer,p_class)
 on conflict(learner_id,module_id) do update set reviewer_id=excluded.reviewer_id,foundation_class_id=excluded.foundation_class_id;
 insert into public.training_audit(action,module_id,learner_id) values('enrolled',p_module,learner);
 return learner;
end $$;
create function training_private.training_assign_editor(p_user uuid,p_module text,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not training_private.is_pastor() then raise exception 'Pastor access required' using errcode='42501'; end if;
 if p_enabled then insert into public.training_editors(user_id,module_id) values(p_user,p_module) on conflict do nothing;
 else delete from public.training_editors where user_id=p_user and module_id=p_module; end if;
 insert into public.training_audit(action,module_id,detail) values('editor_assignment',p_module,jsonb_build_object('user',p_user,'enabled',p_enabled));
end $$;
create function training_private.training_equivalence(p_learner uuid,p_reason text,p_enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not training_private.is_pastor() then raise exception 'Pastor access required' using errcode='42501'; end if;
 if exists(select 1 from public.training_learners where id=p_learner and user_id=auth.uid()) then raise exception 'A second pastor must assess your equivalence'; end if;
 if p_enabled then insert into public.training_equivalences(learner_id,reason) values(p_learner,p_reason)
 on conflict(learner_id) do update set reason=excluded.reason,approved_by=auth.uid(),approved_at=now();
 else delete from public.training_equivalences where learner_id=p_learner; end if;
 insert into public.training_audit(action,module_id,learner_id,detail) values('equivalence','foundation',p_learner,jsonb_build_object('enabled',p_enabled,'reason',p_reason));
end $$;
revoke all on function training_private.training_enrol(uuid,uuid,text,text,uuid,uuid),training_private.training_assign_editor(uuid,text,boolean),training_private.training_equivalence(uuid,text,boolean) from public,anon;
grant execute on function training_private.training_enrol(uuid,uuid,text,text,uuid,uuid),training_private.training_assign_editor(uuid,text,boolean),training_private.training_equivalence(uuid,text,boolean) to authenticated;

create function training_private.training_link_account(p_learner uuid,p_email text)
returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if not training_private.is_pastor() then raise exception 'Pastor access required' using errcode='42501'; end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
 if target is null then raise exception 'An existing confirmed account is required'; end if;
 update public.training_learners set user_id=target where id=p_learner and (user_id is null or user_id=target);
 if not found then raise exception 'This learner is already linked to a different account'; end if;
 insert into public.training_audit(action,module_id,learner_id) values('account_linked','foundation',p_learner);
end $$;
revoke all on function training_private.training_link_account(uuid,text) from public,anon;
grant execute on function training_private.training_link_account(uuid,text) to authenticated;

create function public.training_save_module(p_id text,p_revision integer,p_content jsonb,p_expected_at timestamptz default null) returns void language plpgsql security invoker set search_path='' as $$begin if current_user='anon' or auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if; perform training_private.training_save_module(p_id,p_revision,p_content,p_expected_at); return; end$$;
revoke all on function training_private.training_save_module(text,integer,jsonb,timestamptz) from public,anon;
grant execute on function training_private.training_save_module(text,integer,jsonb,timestamptz) to authenticated;

create function public.training_publish(p_id text,p_revision integer,p_action text) returns void language plpgsql security invoker set search_path='' as $$begin if current_user='anon' or auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if; perform training_private.training_publish(p_id,p_revision,p_action); return; end$$;
revoke all on function training_private.training_publish(text,integer,text) from public,anon;
grant execute on function training_private.training_publish(text,integer,text) to authenticated;

create function public.training_record(p_learner uuid,p_module text,p_revision integer,p_lessons text[],p_answers jsonb default null) returns jsonb language plpgsql security invoker set search_path='' as $$begin if current_user='anon' or auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if; return training_private.training_record(p_learner,p_module,p_revision,p_lessons,p_answers); end$$;
revoke all on function training_private.training_record(uuid,text,integer,text[],jsonb) from public,anon;
grant execute on function training_private.training_record(uuid,text,integer,text[],jsonb) to authenticated;

create function public.training_review(p_learner uuid,p_module text,p_revision integer,p_attendance boolean,p_practical boolean,p_note text) returns void language plpgsql security invoker set search_path='' as $$begin if current_user='anon' or auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if; perform training_private.training_review(p_learner,p_module,p_revision,p_attendance,p_practical,p_note); return; end$$;
revoke all on function training_private.training_review(uuid,text,integer,boolean,boolean,text) from public,anon;
grant execute on function training_private.training_review(uuid,text,integer,boolean,boolean,text) to authenticated;

create function public.training_enrol(p_person uuid,p_user uuid,p_name text,p_module text,p_reviewer uuid,p_class uuid default null) returns uuid language plpgsql security invoker set search_path='' as $$begin if current_user='anon' or auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if; return training_private.training_enrol(p_person,p_user,p_name,p_module,p_reviewer,p_class); end$$;
revoke all on function training_private.training_enrol(uuid,uuid,text,text,uuid,uuid) from public,anon;
grant execute on function training_private.training_enrol(uuid,uuid,text,text,uuid,uuid) to authenticated;

create function public.training_assign_editor(p_user uuid,p_module text,p_enabled boolean) returns void language plpgsql security invoker set search_path='' as $$begin if current_user='anon' or auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if; perform training_private.training_assign_editor(p_user,p_module,p_enabled); return; end$$;
revoke all on function training_private.training_assign_editor(uuid,text,boolean) from public,anon;
grant execute on function training_private.training_assign_editor(uuid,text,boolean) to authenticated;

create function public.training_equivalence(p_learner uuid,p_reason text,p_enabled boolean) returns void language plpgsql security invoker set search_path='' as $$begin if current_user='anon' or auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if; perform training_private.training_equivalence(p_learner,p_reason,p_enabled); return; end$$;
revoke all on function training_private.training_equivalence(uuid,text,boolean) from public,anon;
grant execute on function training_private.training_equivalence(uuid,text,boolean) to authenticated;

create function public.training_link_account(p_learner uuid,p_email text) returns void language plpgsql security invoker set search_path='' as $$begin if current_user='anon' or auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if; perform training_private.training_link_account(p_learner,p_email); return; end$$;
revoke all on function training_private.training_link_account(uuid,text) from public,anon;
grant execute on function training_private.training_link_account(uuid,text) to authenticated;

-- All mutations use checked RPCs; clients cannot set approval columns directly.
revoke all on function public.training_access(), public.training_save_module(text,integer,jsonb,timestamptz),
 public.training_publish(text,integer,text),public.training_record(uuid,text,integer,text[],jsonb),
 public.training_review(uuid,text,integer,boolean,boolean,text) from public,anon;
grant execute on function public.training_access(),public.training_save_module(text,integer,jsonb,timestamptz),
 public.training_publish(text,integer,text),public.training_record(uuid,text,integer,text[],jsonb),
 public.training_review(uuid,text,integer,boolean,boolean,text) to authenticated;

revoke all on function public.training_enrol(uuid,uuid,text,text,uuid,uuid),public.training_assign_editor(uuid,text,boolean),public.training_equivalence(uuid,text,boolean),public.training_link_account(uuid,text) from public,anon;
grant execute on function public.training_enrol(uuid,uuid,text,text,uuid,uuid),public.training_assign_editor(uuid,text,boolean),public.training_equivalence(uuid,text,boolean),public.training_link_account(uuid,text) to authenticated;
-- Invoker entry points explicitly reject unsigned callers before touching private helpers.
-- Keep this guard even on deployments whose session extensions mishandle ACL errors.
grant execute on function public.training_access(),public.training_save_module(text,integer,jsonb,timestamptz),public.training_publish(text,integer,text),public.training_record(uuid,text,integer,text[],jsonb),public.training_review(uuid,text,integer,boolean,boolean,text),public.training_enrol(uuid,uuid,text,text,uuid,uuid),public.training_assign_editor(uuid,text,boolean),public.training_equivalence(uuid,text,boolean),public.training_link_account(uuid,text) to anon;
commit;
