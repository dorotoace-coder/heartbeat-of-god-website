-- Partnership messaging for Dee/Hermes (HBG administration mandate, 2026-11-24).
-- Adds a send log (one row per commitment/kind/period, so a message can never go twice),
-- an email suppression list (opt-out, bounce, complaint), and four functions that are the
-- ONLY things the narrow hbg_ops_mailer role may run. No table is readable by that role.
-- Giving amounts never leave the database through these functions except to the partner's
-- own address; the summary returns counts only.
begin;

create table public.partnership_messages (
 id uuid primary key default gen_random_uuid(),
 commitment_id uuid not null references public.partnership_commitments on delete cascade,
 kind text not null check (kind in ('commitment_ack','reminder')),
 period_key text not null check (length(period_key) between 4 and 16),
 status text not null default 'claimed' check (status in ('claimed','sent','failed')),
 provider_message_id text,
 error text check (error is null or length(error) <= 500),
 created_at timestamptz not null default now(),
 finished_at timestamptz,
 unique (commitment_id, kind, period_key)
);
create index partnership_messages_status on public.partnership_messages(status, created_at);

create table public.email_suppressions (
 email text primary key check (email = lower(trim(email)) and position('@' in email) > 1),
 reason text not null check (reason in ('opt_out','bounce','complaint','manual')),
 source text check (source is null or length(source) <= 200),
 created_at timestamptz not null default now()
);

alter table public.partnership_messages enable row level security;
alter table public.email_suppressions enable row level security;
revoke all on public.partnership_messages, public.email_suppressions from public, anon, authenticated;
grant all on public.partnership_messages, public.email_suppressions to service_role;
create policy messages_officer_read on public.partnership_messages for select to authenticated using (public.partnership_officer());
grant select on public.partnership_messages to authenticated;

-- Due messages. Rules (all must hold):
--  * partner email confirmed and not suppressed;
--  * commitment_ack: commitment created since p_since and within 7 days, not ended;
--  * reminder: active, manual, weekly/monthly, updates_opt_in, started, and not created in the
--    current period (the acknowledgement covers the first period); paused/ended never remind;
--  * no log row yet for that commitment/kind/period (claimed, sent OR failed: failures are
--    never auto-retried, because a failed SMTP reply can still mean delivered).
-- p_dry = true previews without claiming. Otherwise the rows are claimed atomically.
create function public.partnership_due_messages(p_now timestamptz, p_since timestamptz, p_dry boolean, p_limit int default 50)
returns table (message_id uuid, commitment_id uuid, kind text, period_key text, email text, full_name text,
 project text, frequency text, currency text, amount numeric, state text, updates_opt_in boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare d date := (p_now at time zone 'UTC')::date;
begin
 if p_limit is null or p_limit < 1 or p_limit > 200 then raise exception 'Limit must be 1-200'; end if;
 if p_since is null then raise exception 'p_since is required'; end if;
 create temporary table if not exists pg_temp._due (commitment_id uuid, kind text, period_key text) on commit drop;
 truncate pg_temp._due;
 insert into pg_temp._due
 select c.id, 'commitment_ack', 'once'
 from public.partnership_commitments c join auth.users u on u.id = c.user_id
 where c.state <> 'ended' and c.created_at >= p_since and c.created_at >= p_now - interval '7 days' and c.created_at <= p_now
   and u.email_confirmed_at is not null
   and not exists (select 1 from public.email_suppressions s where s.email = lower(trim(u.email)))
   and not exists (select 1 from public.partnership_messages m where m.commitment_id = c.id and m.kind = 'commitment_ack')
 union all
 select c.id, 'reminder', p.k
 from public.partnership_commitments c join auth.users u on u.id = c.user_id
 cross join lateral (select case c.frequency when 'weekly' then to_char(d, 'IYYY-"W"IW') else to_char(d, 'YYYY-MM') end as k,
   case c.frequency when 'weekly' then to_char((c.created_at at time zone 'UTC')::date, 'IYYY-"W"IW') else to_char((c.created_at at time zone 'UTC')::date, 'YYYY-MM') end as created_k) p
 where c.state = 'active' and c.method = 'manual' and c.frequency in ('weekly','monthly') and c.updates_opt_in
   and c.start_date <= d and p.k <> p.created_k
   and u.email_confirmed_at is not null
   and not exists (select 1 from public.email_suppressions s where s.email = lower(trim(u.email)))
   and not exists (select 1 from public.partnership_messages m where m.commitment_id = c.id and m.kind = 'reminder' and m.period_key = p.k)
 limit p_limit;

 if p_dry then
  return query select null::uuid, x.commitment_id, x.kind, x.period_key, lower(trim(u.email))::text, c.full_name, c.project, c.frequency, c.currency, c.amount, c.state, c.updates_opt_in
   from pg_temp._due x join public.partnership_commitments c on c.id = x.commitment_id join auth.users u on u.id = c.user_id;
  return;
 end if;
 return query
 with claimed as (
  insert into public.partnership_messages (commitment_id, kind, period_key)
  select x.commitment_id, x.kind, x.period_key from pg_temp._due x
  on conflict (commitment_id, kind, period_key) do nothing
  returning partnership_messages.id, partnership_messages.commitment_id, partnership_messages.kind, partnership_messages.period_key)
 select k.id, k.commitment_id, k.kind, k.period_key, lower(trim(u.email))::text, c.full_name, c.project, c.frequency, c.currency, c.amount, c.state, c.updates_opt_in
 from claimed k join public.partnership_commitments c on c.id = k.commitment_id join auth.users u on u.id = c.user_id;
end $$;

-- Record the outcome of one claimed message. Only claimed rows can change, once.
create function public.partnership_record_message(p_id uuid, p_sent boolean, p_provider_id text, p_error text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 update public.partnership_messages
 set status = case when p_sent then 'sent' else 'failed' end, provider_message_id = left(p_provider_id, 300),
     error = case when p_sent then null else left(coalesce(p_error, 'unknown'), 500) end, finished_at = now()
 where id = p_id and status = 'claimed';
 if not found then raise exception 'Message is not awaiting an outcome'; end if;
end $$;

-- Opt-out / bounce / complaint. An opt-out also stops updates on every commitment for that address.
create function public.partnership_suppress(p_email text, p_reason text, p_source text)
returns int language plpgsql security definer set search_path = '' as $$
declare e text := lower(trim(p_email)); n int;
begin
 if e is null or position('@' in e) < 2 then raise exception 'Invalid email'; end if;
 insert into public.email_suppressions (email, reason, source) values (e, p_reason, left(p_source, 200))
 on conflict (email) do nothing;
 update public.partnership_commitments c set updates_opt_in = false
 from auth.users u where u.id = c.user_id and lower(trim(u.email)) = e and c.updates_opt_in;
 get diagnostics n = row_count;
 return n;
end $$;

-- Private operational summary for Dee: counts and ages only. No names, emails or amounts.
create function public.partnership_ops_summary(p_now timestamptz)
returns jsonb language sql stable security definer set search_path = '' as $$
 select jsonb_build_object(
  'as_of', p_now,
  'commitments', (select coalesce(jsonb_object_agg(state, n), '{}') from (select state, count(*) n from public.partnership_commitments group by state) s),
  'active_by_area', (select coalesce(jsonb_object_agg(project, n), '{}') from (select project, count(*) n from public.partnership_commitments where state = 'active' group by project) s),
  'active_with_updates', (select count(*) from public.partnership_commitments where state = 'active' and updates_opt_in),
  'new_last_7_days', (select count(*) from public.partnership_commitments where created_at >= p_now - interval '7 days'),
  'messages_30_days', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from public.partnership_messages where created_at >= p_now - interval '30 days' group by status) s),
  'failed_30_days', (select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'period', period_key, 'error', error)), '[]') from (select kind, period_key, error from public.partnership_messages where status = 'failed' and created_at >= p_now - interval '30 days' order by created_at desc limit 20) f),
  'stuck_claimed', (select count(*) from public.partnership_messages where status = 'claimed' and created_at < p_now - interval '1 hour'),
  'gifts_awaiting_officer_check', (select count(*) from public.partnership_gifts where state = 'pending'),
  'oldest_unchecked_gift_days', (select floor(extract(epoch from p_now - min(created_at)) / 86400)::int from public.partnership_gifts where state = 'pending'),
  'suppressed_addresses', (select count(*) from public.email_suppressions)
 ) $$;

-- Narrow role for Hermes. Created without LOGIN: Doroto activates it separately with
--   alter role hbg_ops_mailer login password '<generated>';
-- It can run the four functions above and nothing else.
do $$ begin
 if not exists (select 1 from pg_roles where rolname = 'hbg_ops_mailer') then create role hbg_ops_mailer nologin noinherit; end if;
end $$;
grant usage on schema public to hbg_ops_mailer;
revoke all on function public.partnership_due_messages(timestamptz, timestamptz, boolean, int), public.partnership_record_message(uuid, boolean, text, text),
 public.partnership_suppress(text, text, text), public.partnership_ops_summary(timestamptz) from public, anon, authenticated;
grant execute on function public.partnership_due_messages(timestamptz, timestamptz, boolean, int), public.partnership_record_message(uuid, boolean, text, text),
 public.partnership_suppress(text, text, text), public.partnership_ops_summary(timestamptz) to hbg_ops_mailer, service_role;
commit;
