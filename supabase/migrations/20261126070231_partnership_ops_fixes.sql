-- Partnership message date, remaining-balance and verified-gift acknowledgement fixes.
begin;
alter table public.partnership_messages drop constraint partnership_messages_kind_check;
alter table public.partnership_messages add constraint partnership_messages_kind_check
 check (kind in ('commitment_ack','reminder','payment_ack'));
alter table public.partnership_messages drop constraint partnership_messages_period_key_check;
alter table public.partnership_messages add constraint partnership_messages_period_key_check
 check (length(period_key) between 4 and 64);

create or replace function public.partnership_due_messages(p_now timestamptz,p_since timestamptz,p_dry boolean,p_limit int default 50)
returns table(message_id uuid,commitment_id uuid,kind text,period_key text,email text,full_name text,
 project text,frequency text,currency text,amount numeric,state text,updates_opt_in boolean)
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare d date := (p_now at time zone 'UTC')::date;
begin
 if p_now is null or p_since is null then raise exception 'Times are required'; end if;
 if p_limit is null or p_limit < 1 or p_limit > 200 then raise exception 'Limit must be 1-200'; end if;
 create temporary table if not exists pg_temp._hbg_due (
  commitment_id uuid,kind text,period_key text,mail_amount numeric,mail_currency text,sort_at timestamptz
 ) on commit drop;
 truncate pg_temp._hbg_due;
 insert into pg_temp._hbg_due
 with eligible as (
  select c.* from public.partnership_commitments c join auth.users u on u.id=c.user_id
  where u.email_confirmed_at is not null and not exists (
   select 1 from public.email_suppressions s where s.email=lower(trim(u.email)))
 ), candidates as (
  select c.id,'commitment_ack'::text kind,'once'::text period_key,c.amount,c.currency,c.created_at sort_at
  from eligible c where c.state <> 'ended' and c.created_at between p_since and p_now
  union all
  -- Each gift gets its own key. Pausing a commitment must not hide an actual confirmed gift.
  select c.id,'payment_ack',g.id::text,g.amount-coalesce(g.refunded_amount,0),g.currency,g.received_at
  from eligible c join public.partnership_gifts g on g.commitment_id=c.id
  where g.state='received' and g.confirmed_by is not null and g.confirmed_by is distinct from g.reported_by
   and g.received_at between p_since and p_now and not coalesce(g.disputed,false)
   and g.amount > coalesce(g.refunded_amount,0)
  union all
  select c.id,'reminder','due:'||period.begins::text,
   c.amount - coalesce((select sum(g.amount-coalesce(g.refunded_amount,0))
    from public.partnership_gifts g where g.commitment_id=c.id and g.state='received'
     and not coalesce(g.disputed,false) and g.currency=c.currency
     and g.received_at>=period.begins::timestamptz and g.received_at<boundary.ends::timestamptz),0),
   c.currency,period.begins::timestamptz
  from eligible c
  cross join lateral (select
   ((extract(year from d)::int-extract(year from c.start_date)::int)*12
     +extract(month from d)::int-extract(month from c.start_date)::int) as n) months
  cross join lateral (select case when c.frequency='weekly'
   then c.start_date + ((d-c.start_date)/7)*7
   else (c.start_date + make_interval(months=>months.n))::date end as nominal) raw
  cross join lateral (select case when c.frequency='monthly' and raw.nominal>d
   then (c.start_date+make_interval(months=>months.n-1))::date else raw.nominal end as begins) period
  cross join lateral (select case when c.frequency='weekly' then period.begins+7
   else (c.start_date+make_interval(months=>months.n + case when raw.nominal>d then 0 else 1 end))::date end as ends) boundary
  where c.state='active' and c.method='manual' and c.frequency in ('weekly','monthly')
   and c.updates_opt_in and c.start_date <= d
   -- First commitment acknowledgement covers the period in which the commitment was created.
   and c.created_at < period.begins::timestamptz
   -- Avoid migration duplicates from the old calendar-period scheme.
   and not exists (select 1 from public.partnership_messages m where m.commitment_id=c.id and m.kind='reminder'
    and m.created_at>=period.begins::timestamptz and m.created_at<boundary.ends::timestamptz)
   -- Pending reports await human verification. Do not chase them in the meantime.
   and not exists (select 1 from public.partnership_gifts g where g.commitment_id=c.id and g.state='pending'
    and g.created_at>=period.begins::timestamptz and g.created_at<boundary.ends::timestamptz)
   and coalesce((select sum(g.amount-coalesce(g.refunded_amount,0)) from public.partnership_gifts g
    where g.commitment_id=c.id and g.state='received' and not coalesce(g.disputed,false) and g.currency=c.currency
     and g.received_at>=period.begins::timestamptz and g.received_at<boundary.ends::timestamptz),0) < c.amount
 )
 select x.* from candidates x where not exists (
  select 1 from public.partnership_messages m where m.commitment_id=x.id and m.kind=x.kind and m.period_key=x.period_key)
 order by x.sort_at,x.id,x.kind,x.period_key limit p_limit;
 if p_dry then
  return query select null::uuid,x.commitment_id,x.kind,x.period_key,lower(trim(u.email)),c.full_name,
   c.project,c.frequency,x.mail_currency,x.mail_amount,c.state,c.updates_opt_in
  from pg_temp._hbg_due x join public.partnership_commitments c on c.id=x.commitment_id join auth.users u on u.id=c.user_id;
 else
  return query with claimed as (
   insert into public.partnership_messages(commitment_id,kind,period_key)
   select x.commitment_id,x.kind,x.period_key from pg_temp._hbg_due x
   on conflict (commitment_id,kind,period_key) do nothing returning partnership_messages.*
  ) select k.id,x.commitment_id,x.kind,x.period_key,lower(trim(u.email)),c.full_name,
   c.project,c.frequency,x.mail_currency,x.mail_amount,c.state,c.updates_opt_in
  from claimed k join pg_temp._hbg_due x using(commitment_id,kind,period_key)
   join public.partnership_commitments c on c.id=x.commitment_id join auth.users u on u.id=c.user_id;
 end if;
end $$;
commit;
