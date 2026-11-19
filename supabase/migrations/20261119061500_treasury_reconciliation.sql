begin;

-- The existing monthly summary adds income before it is independently
-- confirmed. This view keeps confirmed and pending amounts apart so a
-- reconciliation never treats an unconfirmed entry as settled. Reversals
-- are income rows with negative amounts and follow the same rule.
create view public.treasury_monthly_reconciliation with (security_invoker = true) as
select church_id,
  date_trunc('month', entry_date::timestamptz)::date as month,
  currency,
  'income'::text as kind,
  category::text as category,
  coalesce(sum(amount) filter (where confirmed_at is not null), 0) as confirmed_total,
  count(*) filter (where confirmed_at is not null) as confirmed_entries,
  coalesce(sum(amount) filter (where confirmed_at is null), 0) as pending_total,
  count(*) filter (where confirmed_at is null) as pending_entries
from public.treasury_income
group by church_id, date_trunc('month', entry_date::timestamptz), currency, category
union all
-- Expenses count only once paid, as in the existing summary.
select church_id,
  date_trunc('month', entry_date::timestamptz)::date,
  currency,
  'expense'::text,
  category::text,
  sum(amount),
  count(*),
  0,
  0
from public.treasury_expenses
where status = 'paid'
group by church_id, date_trunc('month', entry_date::timestamptz), currency, category;

revoke all on public.treasury_monthly_reconciliation from public, anon, authenticated;
grant select on public.treasury_monthly_reconciliation to authenticated;

commit;
