begin;

create table public.treasury_cash_deposits (
 id uuid primary key,
 church_id uuid not null,
 pulse_service_id uuid not null references public.pulse_services,
 currency text not null check(currency in ('NGN','CAD')),
 amount numeric(18,2) not null check(amount > 0),
 bank_reference text not null check(length(trim(bank_reference)) between 1 and 160),
 recorded_by uuid not null references auth.users,
 recorded_at timestamptz not null default now(),
 verified_by uuid references auth.users,
 verified_at timestamptz,
 check((verified_by is null) = (verified_at is null)),
 check(verified_by <> recorded_by)
);
create unique index treasury_deposit_reference on public.treasury_cash_deposits(church_id,lower(trim(bank_reference)));
alter table public.treasury_cash_deposits enable row level security;
revoke all on public.treasury_cash_deposits from public,anon,authenticated;
grant select on public.treasury_cash_deposits to authenticated;
create policy officers_read_cash_deposits on public.treasury_cash_deposits for select to authenticated using
 (public.treasury_has_role(church_id,array['admin','treasurer']::public.treasury_role[]));

create function public.record_cash_deposit(p_id uuid,p_church uuid,p_service uuid,p_currency text,p_amount numeric,p_reference text)
returns void language plpgsql security definer set search_path='' as $$
declare available numeric;
begin
 if not coalesce(public.treasury_has_role(p_church,array['admin','treasurer']::public.treasury_role[]),false) then
   raise exception 'Treasury access required' using errcode='42501';
 end if;
 if p_amount is null or p_amount <= 0 or p_amount::text in ('NaN','Infinity') or round(p_amount,2) <> p_amount then
   raise exception 'Enter a positive amount with at most two decimal places';
 end if;
 perform 1 from public.pulse_services where id=p_service for update;
 if not found then raise exception 'Choose a service'; end if;
 if exists(select 1 from public.treasury_cash_deposits where id=p_id and recorded_by=auth.uid()
   and church_id=p_church and pulse_service_id=p_service and currency=p_currency and amount=p_amount and bank_reference=trim(p_reference)) then return; end if;
 select coalesce(sum(amount),0) into available from public.treasury_income
 where church_id=p_church and pulse_service_id=p_service and method='cash' and currency::text=p_currency and confirmed_at is not null;
 select available-coalesce(sum(amount),0) into available from public.treasury_cash_deposits
 where church_id=p_church and pulse_service_id=p_service and currency=p_currency;
 if p_amount>available then raise exception 'Deposit exceeds the confirmed cash remaining for this service and currency'; end if;
 insert into public.treasury_cash_deposits(id,church_id,pulse_service_id,currency,amount,bank_reference,recorded_by)
 values(p_id,p_church,p_service,p_currency,p_amount,trim(p_reference),auth.uid());
end $$;

create function public.verify_cash_deposit(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare deposit public.treasury_cash_deposits;
begin
 select * into deposit from public.treasury_cash_deposits where id=p_id and
 public.treasury_has_role(church_id,array['admin','treasurer']::public.treasury_role[]) for update;
 if not found then raise exception 'Deposit unavailable' using errcode='42501'; end if;
 if deposit.recorded_by=auth.uid() then raise exception 'The other officer must verify the bank record' using errcode='42501'; end if;
 if deposit.verified_at is null then
 update public.treasury_cash_deposits set verified_by=auth.uid(),verified_at=now() where id=p_id;
 end if;
end $$;
revoke all on function public.record_cash_deposit(uuid,uuid,uuid,text,numeric,text),public.verify_cash_deposit(uuid) from public,anon;
grant execute on function public.record_cash_deposit(uuid,uuid,uuid,text,numeric,text),public.verify_cash_deposit(uuid) to authenticated;
commit;
