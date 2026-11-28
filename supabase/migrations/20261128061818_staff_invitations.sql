-- Staff invitations: the owner invites someone by email into one staff role.
-- Access starts when that person accepts, signed in with the invited email and
-- holding the one-time link. Never Treasury, never the owner role.
-- Emails are sent by the staff-invite Supabase function; this file sends nothing.
begin;

create table public.staff_invitations (
 id uuid primary key,
 email text not null check (email = lower(trim(email)) and position('@' in email) > 1 and length(email) <= 254),
 display_name text not null check (length(trim(display_name)) between 1 and 160),
 role text not null check (role in ('outreach_worker','foundation_teacher','media','attendance','pastorate')),
 details jsonb not null default '{}'::jsonb,
 token_hash text not null unique,
 invited_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now() + interval '7 days',
 sent_at timestamptz,
 send_error text check (send_error is null or length(send_error) <= 300),
 accepted_by uuid references auth.users(id),
 accepted_at timestamptz,
 revoked_by uuid references auth.users(id),
 revoked_at timestamptz,
 check ((accepted_at is null) = (accepted_by is null)),
 check ((revoked_at is null) = (revoked_by is null)),
 check (accepted_at is null or revoked_at is null)
);
create unique index staff_invitations_one_open on public.staff_invitations(email, role) where accepted_at is null and revoked_at is null;
create index staff_invitations_recent on public.staff_invitations(invited_by, created_at desc);

alter table public.staff_invitations enable row level security;
revoke all on public.staff_invitations from public, anon, authenticated;
-- The owner reads invitations without their token hashes.
grant select (id, email, display_name, role, details, invited_by, created_at, expires_at, sent_at, send_error,
 accepted_by, accepted_at, revoked_by, revoked_at) on public.staff_invitations to authenticated;
create policy staff_invitations_owner_read on public.staff_invitations for select to authenticated
 using (exists(select 1 from public.profiles where id=(select auth.uid()) and role='owner'));

create function public.staff_invite_token_hash(p_token text) returns text
language sql immutable set search_path='' as $$ select encode(sha256(convert_to(coalesce(p_token,''),'UTF8')),'hex') $$;
revoke all on function public.staff_invite_token_hash(text) from public, anon, authenticated;

-- True when the account already serves in a department (one department per person).
create function public.staff_has_department(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.outreach_workers where user_id=p_user)
  or exists(select 1 from public.foundation_teachers where id=p_user)
  or exists(select 1 from public.media_vault_staff where user_id=p_user)
  or exists(select 1 from public.service_attendance_access where user_id=p_user)
  or exists(select 1 from public.treasury_portal_access where user_id=p_user) $$;
revoke all on function public.staff_has_department(uuid) from public, anon, authenticated;

create function public.staff_invite_validate(p_role text, p_details jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare d jsonb := coalesce(p_details,'{}'::jsonb);
begin
 if p_role='foundation_teacher' then
  if d->>'trained_on' is null or (d->>'trained_on') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Enter the training completed date' using errcode='HB036'; end if;
  return jsonb_build_object('trained_on', (d->>'trained_on')::date);
 elsif p_role='pastorate' then
  if length(trim(coalesce(d->>'responsibility',''))) not between 3 and 160
     or length(trim(coalesce(d->>'assignment',''))) not between 5 and 2000
     or d->>'review_on' is null or (d->>'review_on') !~ '^\d{4}-\d{2}-\d{2}$' then
   raise exception 'Enter the responsibility, assignment limits and review date' using errcode='HB036';
  end if;
  return jsonb_build_object('responsibility', trim(d->>'responsibility'), 'assignment', trim(d->>'assignment'), 'review_on', (d->>'review_on')::date);
 end if;
 return '{}'::jsonb;
end $$;
revoke all on function public.staff_invite_validate(text,jsonb) from public, anon, authenticated;

-- Create an invitation and return its one-time token (shown to the sending function only).
create function public.staff_invite_create(p_id uuid, p_email text, p_name text, p_role text, p_details jsonb)
returns text language plpgsql security definer set search_path='' as $$
declare v_email text := lower(trim(p_email)); token text; existing_account uuid; clean jsonb;
begin
 perform public.require_person_owner();
 if exists(select 1 from public.staff_invitations where id=p_id) then
  raise exception 'This invitation was already created. Check the list and use Resend.' using errcode='HB032';
 end if;
 if p_id is null or v_email is null or position('@' in v_email) < 2 or length(v_email) > 254
    or length(trim(coalesce(p_name,''))) not between 1 and 160
    or p_role is null or p_role not in ('outreach_worker','foundation_teacher','media','attendance','pastorate') then
  raise exception 'Check the name, email and role' using errcode='HB036';
 end if;
 clean := public.staff_invite_validate(p_role, p_details);
 if (select count(*) from public.staff_invitations where invited_by=auth.uid() and created_at > now() - interval '1 day') >= 20 then
  raise exception 'Daily invitation limit reached' using errcode='HB035';
 end if;
 select id into existing_account from auth.users where lower(trim(auth.users.email))=v_email;
 if existing_account is not null and (
    (p_role<>'pastorate' and public.staff_has_department(existing_account))
    or (p_role='pastorate' and exists(select 1 from public.pastorate_assignments where user_id=existing_account and active))) then
  raise exception 'This person already has that kind of access' using errcode='HB031';
 end if;
 token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
 begin
  insert into public.staff_invitations(id,email,display_name,role,details,token_hash,invited_by)
  values (p_id, v_email, trim(p_name), p_role, clean, public.staff_invite_token_hash(token), auth.uid());
 exception when unique_violation then
  raise exception 'An open invitation for this person and role already exists' using errcode='HB037';
 end;
 return token;
end $$;

-- Replace the token of an open invitation, for a resend. The old link stops working.
create function public.staff_invite_reissue(p_id uuid) returns text
language plpgsql security definer set search_path='' as $$
declare token text;
begin
 perform public.require_person_owner();
 token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
 update public.staff_invitations set token_hash=public.staff_invite_token_hash(token), expires_at=now() + interval '7 days', sent_at=null, send_error=null
  where id=p_id and accepted_at is null and revoked_at is null;
 if not found then raise exception 'Only an open invitation can be resent' using errcode='HB038'; end if;
 return token;
end $$;

create function public.staff_invite_mark_sent(p_id uuid, p_ok boolean, p_error text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.require_person_owner();
 update public.staff_invitations set sent_at=case when p_ok then now() end,
  send_error=case when p_ok then null else left(coalesce(nullif(trim(p_error),''),'Sending failed'),300) end
  where id=p_id and accepted_at is null and revoked_at is null;
end $$;

create function public.staff_invite_revoke(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform public.require_person_owner();
 update public.staff_invitations set revoked_at=now(), revoked_by=auth.uid() where id=p_id and accepted_at is null and revoked_at is null;
 if not found and not exists(select 1 from public.staff_invitations where id=p_id and revoked_at is not null) then
  raise exception 'Only an open invitation can be revoked' using errcode='HB038';
 end if;
end $$;

-- What a link holder is being offered. Shows nothing about other invitations.
create function public.staff_invite_preview(p_token text)
returns table(display_name text, role text, details jsonb, expires_at timestamptz, status text, email_matches boolean)
language plpgsql stable security definer set search_path='' as $$
declare invitation public.staff_invitations; own_email text;
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
 select * into invitation from public.staff_invitations i where i.token_hash=public.staff_invite_token_hash(p_token);
 if not found then raise exception 'This invitation link is not valid' using errcode='HB033'; end if;
 select lower(trim(u.email)) into own_email from auth.users u where u.id=auth.uid();
 return query select invitation.display_name, invitation.role, invitation.details, invitation.expires_at,
  case when invitation.revoked_at is not null then 'revoked'
       when invitation.accepted_at is not null then 'accepted'
       when invitation.expires_at < now() then 'expired' else 'open' end,
  own_email=invitation.email;
end $$;

-- Accept: the signed-in account's email must match, once, before expiry.
create function public.staff_invite_accept(p_token text) returns text
language plpgsql security definer set search_path='' as $$
declare invitation public.staff_invitations; own_email text; me uuid := auth.uid();
begin
 if me is null then raise exception 'Sign in first' using errcode='42501'; end if;
 select * into invitation from public.staff_invitations i where i.token_hash=public.staff_invite_token_hash(p_token) for update;
 if not found then raise exception 'This invitation link is not valid' using errcode='HB033'; end if;
 if invitation.accepted_at is not null then
  if invitation.accepted_by=me then return invitation.role; end if;
  raise exception 'This invitation has already been used' using errcode='HB039';
 end if;
 if invitation.revoked_at is not null then raise exception 'This invitation was withdrawn' using errcode='HB039'; end if;
 if invitation.expires_at < now() then raise exception 'This invitation has expired' using errcode='HB039'; end if;
 select lower(trim(u.email)) into own_email from auth.users u where u.id=me;
 if own_email is distinct from invitation.email then
  raise exception 'Sign in with the email address the invitation was sent to' using errcode='HB034';
 end if;
 if invitation.role<>'pastorate' and public.staff_has_department(me) then
  raise exception 'You already serve in a department' using errcode='HB031';
 end if;
 if invitation.role='outreach_worker' then
  insert into public.outreach_workers(user_id, full_name) values (me, invitation.display_name);
 elsif invitation.role='foundation_teacher' then
  insert into public.foundation_teachers(id, full_name, trained_on) values (me, invitation.display_name, (invitation.details->>'trained_on')::date);
 elsif invitation.role='media' then
  insert into public.media_vault_staff(user_id) values (me);
 elsif invitation.role='attendance' then
  insert into public.service_attendance_access(user_id, can_submit) values (me, true);
 elsif invitation.role='pastorate' then
  if exists(select 1 from public.pastorate_assignments where user_id=me and active) then
   raise exception 'You already have a pastoral assignment' using errcode='HB031';
  end if;
  insert into public.pastorate_assignments(user_id, display_name, responsibility, assignment, review_on, active, approved_by)
  values (me, invitation.display_name, invitation.details->>'responsibility', invitation.details->>'assignment',
   (invitation.details->>'review_on')::date, true, invitation.invited_by)
  on conflict (user_id) do update set display_name=excluded.display_name, responsibility=excluded.responsibility,
   assignment=excluded.assignment, review_on=excluded.review_on, active=true, approved_by=excluded.approved_by;
 end if;
 update public.staff_invitations set accepted_at=now(), accepted_by=me where id=invitation.id;
 return invitation.role;
end $$;

revoke all on function public.staff_invite_create(uuid,text,text,text,jsonb), public.staff_invite_reissue(uuid),
 public.staff_invite_mark_sent(uuid,boolean,text), public.staff_invite_revoke(uuid),
 public.staff_invite_preview(text), public.staff_invite_accept(text) from public, anon, authenticated;
grant execute on function public.staff_invite_create(uuid,text,text,text,jsonb), public.staff_invite_reissue(uuid),
 public.staff_invite_mark_sent(uuid,boolean,text), public.staff_invite_revoke(uuid),
 public.staff_invite_preview(text), public.staff_invite_accept(text) to authenticated;
commit;
