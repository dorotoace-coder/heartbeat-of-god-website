begin;
create table public.partnership_commitments (
 id uuid primary key,user_id uuid not null references auth.users,full_name text not null check(length(trim(full_name)) between 2 and 120),
 project text not null check(project in ('clt','salvation-challenge','church-building','hbg-tv','feed-the-future')),
 frequency text not null check(frequency in ('weekly','monthly','once')),method text not null check(method in ('manual','stripe')),
 currency text not null check(currency in ('NGN','CAD','USD','EUR')),amount numeric(18,2) not null check(amount>0 and amount<=100000000 and amount::text not in ('NaN','Infinity')),
 state text not null default 'active' check(state in ('active','paused','ended')),start_date date not null default current_date,
 updates_opt_in boolean not null default false,consented_at timestamptz not null default now(),created_at timestamptz not null default now(),
 stripe_checkout_id text unique,stripe_customer_id text,stripe_subscription_id text unique,provider_status text,provider_event_at bigint not null default 0,
 check(method<>'stripe' or currency<>'NGN')
);
create unique index partnership_one_automatic_area on public.partnership_commitments(user_id,project) where method='stripe' and state='active';
create index partnership_owner on public.partnership_commitments(user_id);
create table public.partnership_gifts (
 id uuid primary key default gen_random_uuid(),commitment_id uuid not null references public.partnership_commitments,
 amount numeric(18,2) not null check(amount>0 and amount::text not in ('NaN','Infinity')),currency text not null check(currency in ('NGN','CAD','USD','EUR')),
 reference text not null check(length(trim(reference)) between 3 and 160),state text not null default 'pending' check(state in ('pending','received','rejected')),
 reported_by uuid references auth.users,confirmed_by uuid references auth.users,created_at timestamptz not null default now(),received_at timestamptz,
 provider_key text unique,payment_intent_id text unique,refunded_amount numeric(18,2) not null default 0,disputed boolean not null default false,reversal_event_at bigint not null default 0,check(refunded_amount>=0 and refunded_amount<=amount),check(confirmed_by is null or confirmed_by<>reported_by),check((state='received')=(received_at is not null))
);
create index partnership_gift_commitment on public.partnership_gifts(commitment_id);
-- One bank reference cannot be credited to two partners or two projects.
create unique index partnership_manual_reference on public.partnership_gifts(currency,lower(trim(reference))) where provider_key is null;
create table public.partnership_events(event_id text primary key,created_at timestamptz not null default now());
create function public.partnership_officer() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.treasury_portal_access where user_id=auth.uid() and office in ('pastor','treasury_leader')); 
$$;
alter table public.partnership_commitments enable row level security;
alter table public.partnership_gifts enable row level security;
alter table public.partnership_events enable row level security;
revoke all on public.partnership_commitments,public.partnership_gifts,public.partnership_events from public,anon,authenticated;
grant select on public.partnership_commitments,public.partnership_gifts to authenticated;
grant all on public.partnership_commitments,public.partnership_gifts,public.partnership_events to service_role;
create policy commitments_read on public.partnership_commitments for select to authenticated using(user_id=auth.uid() or public.partnership_officer());
create policy gifts_read on public.partnership_gifts for select to authenticated using(public.partnership_officer() or exists(select 1 from public.partnership_commitments c where c.id=commitment_id and c.user_id=auth.uid()));

create function public.join_partnership(p_id uuid,p_name text,p_project text,p_frequency text,p_method text,p_currency text,p_amount numeric,p_start date,p_consent boolean,p_updates boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing public.partnership_commitments;
begin
 if auth.uid() is null or not coalesce(p_consent,false) then raise exception 'Sign in and confirm your commitment' using errcode='42501';end if;
 if p_amount is null or round(p_amount,2)<>p_amount then raise exception 'Use at most two decimal places';end if;
 if p_start is null or p_start<current_date or p_start>current_date+366 then raise exception 'Choose a start date within the next year';end if;
 if p_method='stripe' and p_start<>current_date then raise exception 'Automatic giving starts when checkout is completed';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text||':'||p_project)); select * into existing from public.partnership_commitments where id=p_id;
 if found then
  if existing.user_id=auth.uid() and existing.full_name=trim(p_name) and existing.project=p_project and existing.frequency=p_frequency and existing.method=p_method and existing.currency=p_currency and existing.amount=p_amount and existing.start_date=p_start and existing.updates_opt_in=p_updates then return p_id;end if;
  raise exception 'Request already used for different details';
 end if;
 if p_method='stripe' and exists(select 1 from public.partnership_commitments where user_id=auth.uid() and project=p_project and method='stripe' and state='active') then raise exception 'An automatic commitment already exists for this area. Manage or cancel it first.';end if;
 insert into public.partnership_commitments(id,user_id,full_name,project,frequency,method,currency,amount,start_date,updates_opt_in)
 values(p_id,auth.uid(),trim(p_name),p_project,p_frequency,p_method,p_currency,p_amount,p_start,coalesce(p_updates,false));
 return p_id;
end $$;
create function public.update_manual_partnership(p_id uuid,p_state text,p_updates boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_state not in ('active','paused','ended') then raise exception 'Invalid state';end if;
 if exists(select 1 from public.partnership_commitments where id=p_id and user_id=auth.uid() and state='ended' and p_state<>'ended') then raise exception 'Ended commitments cannot restart';end if;
 update public.partnership_commitments set state=p_state,updates_opt_in=coalesce(p_updates,false) where id=p_id and user_id=auth.uid() and (method='manual' or state=p_state);
 if not found then raise exception 'Manual commitment unavailable' using errcode='42501';end if;
end $$;
create function public.report_partnership_gift(p_id uuid,p_commitment uuid,p_amount numeric,p_reference text) returns void
language plpgsql security definer set search_path='' as $$
declare c public.partnership_commitments;g public.partnership_gifts;
begin
 select * into c from public.partnership_commitments where id=p_commitment and method='manual' and state='active' and (user_id=auth.uid() or public.partnership_officer()) for update;
 if not found then raise exception 'Commitment unavailable' using errcode='42501';end if;
 if p_amount is null or round(p_amount,2)<>p_amount or p_amount>100000000 then raise exception 'Invalid amount';end if;
 select * into g from public.partnership_gifts where id=p_id;
 if found then
  if g.commitment_id=p_commitment and g.amount=p_amount and g.reference=trim(p_reference) and g.reported_by=auth.uid() then return;end if;
  raise exception 'Request already used';
 end if;
 insert into public.partnership_gifts(id,commitment_id,amount,currency,reference,reported_by) values(p_id,c.id,p_amount,c.currency,trim(p_reference),auth.uid());
end $$;
create function public.review_partnership_gift(p_id uuid,p_received boolean) returns void
language plpgsql security definer set search_path='' as $$
declare g public.partnership_gifts;
begin
 if not public.partnership_officer() then raise exception 'Treasury access required' using errcode='42501';end if;
 select * into g from public.partnership_gifts where id=p_id for update;
 if not found or g.provider_key is not null or g.reported_by=auth.uid() then raise exception 'An independent officer must check this bank record' using errcode='42501';end if;
 if g.state<>'pending' then return;end if;
 update public.partnership_gifts set state=case when p_received then 'received' else 'rejected' end,confirmed_by=auth.uid(),received_at=case when p_received then now() else null end where id=p_id;
end $$;
-- This function is callable ONLY by the server role after checking the Stripe signature.
-- Event receipt and accounting writes are one transaction: failures remain retryable.
create function public.apply_partnership_payment(p_event text,p_event_at bigint,p_commitment uuid,p_customer text,p_subscription text,p_status text,p_key text default null,p_amount numeric default null,p_currency text default null,p_payment text default null,p_refunded numeric default 0,p_disputed boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare c public.partnership_commitments;
begin
 if exists(select 1 from public.partnership_events where event_id=p_event) then return;end if;
 select * into c from public.partnership_commitments where id=p_commitment and method='stripe' for update;
 if not found then raise exception 'Unknown automatic commitment';end if;
 if c.stripe_customer_id is not null and c.stripe_customer_id<>p_customer then raise exception 'Customer mismatch';end if;
 if c.stripe_subscription_id is not null and c.stripe_subscription_id is distinct from p_subscription then raise exception 'Subscription mismatch';end if;
 if p_key is not null then
  if p_amount is null or p_amount<=0 or p_amount<>c.amount or p_currency<>c.currency then raise exception 'Payment amount or currency mismatch';end if;
  insert into public.partnership_gifts(commitment_id,amount,currency,reference,state,received_at,provider_key,payment_intent_id,refunded_amount,disputed)
  values(c.id,p_amount,p_currency,p_key,'received',now(),p_key,p_payment,coalesce(p_refunded,0),coalesce(p_disputed,false)) on conflict(provider_key) do nothing;
 end if;
 update public.partnership_commitments set stripe_customer_id=p_customer,stripe_subscription_id=coalesce(stripe_subscription_id,p_subscription),
 provider_status=case when state='ended' then provider_status when p_event_at>=provider_event_at then p_status else provider_status end,
 state=case when p_event_at>=provider_event_at and (p_status='canceled' or (frequency='once' and p_status='paid')) then 'ended' else state end,
 provider_event_at=greatest(provider_event_at,p_event_at) where id=c.id;
 insert into public.partnership_events(event_id) values(p_event) on conflict do nothing;
end $$;
create function public.sync_partnership_reversal(p_event text,p_event_at bigint,p_payment text,p_refunded numeric default null,p_disputed boolean default null)
returns void language plpgsql security definer set search_path='' as $$
declare g public.partnership_gifts;
begin
 if exists(select 1 from public.partnership_events where event_id=p_event) then return;end if;
 select * into g from public.partnership_gifts where payment_intent_id=p_payment for update;
 if not found then raise exception 'Payment receipt not recorded yet';end if;
 if p_refunded is not null and (p_refunded<0 or p_refunded>g.amount) then raise exception 'Invalid refunded amount';end if;
 update public.partnership_gifts set refunded_amount=greatest(refunded_amount,coalesce(p_refunded,0)),
 disputed=case when p_event_at>=reversal_event_at then coalesce(p_disputed,disputed) else disputed end,
 reversal_event_at=case when p_disputed is null then reversal_event_at else greatest(reversal_event_at,p_event_at) end where id=g.id;
 insert into public.partnership_events(event_id) values(p_event) on conflict do nothing;
end $$;
revoke all on function public.sync_partnership_reversal(text,bigint,text,numeric,boolean) from public,anon,authenticated;
grant execute on function public.sync_partnership_reversal(text,bigint,text,numeric,boolean) to service_role;
revoke all on function public.partnership_officer(),public.join_partnership(uuid,text,text,text,text,text,numeric,date,boolean,boolean),public.update_manual_partnership(uuid,text,boolean),public.report_partnership_gift(uuid,uuid,numeric,text),public.review_partnership_gift(uuid,boolean),public.apply_partnership_payment(text,bigint,uuid,text,text,text,text,numeric,text,text,numeric,boolean) from public,anon;
grant execute on function public.partnership_officer(),public.join_partnership(uuid,text,text,text,text,text,numeric,date,boolean,boolean),public.update_manual_partnership(uuid,text,boolean),public.report_partnership_gift(uuid,uuid,numeric,text),public.review_partnership_gift(uuid,boolean) to authenticated;
revoke all on function public.apply_partnership_payment(text,bigint,uuid,text,text,text,text,numeric,text,text,numeric,boolean) from authenticated;
grant execute on function public.apply_partnership_payment(text,bigint,uuid,text,text,text,text,numeric,text,text,numeric,boolean) to service_role;
commit;
