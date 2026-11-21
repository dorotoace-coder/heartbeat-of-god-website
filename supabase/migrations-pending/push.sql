-- Daily Word web push subscriptions.
-- PENDING — not yet run. Review, then run once in the Supabase SQL editor.
-- Idempotent. Only the server (service-role key) reads/writes this table:
-- RLS is on and there are no public policies, so the anon key cannot see it.

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
-- No policies on purpose: anon/authenticated get nothing; the service role bypasses RLS.
