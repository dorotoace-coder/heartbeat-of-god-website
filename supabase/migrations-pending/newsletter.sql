-- Newsletter subscribers (welcome email + Monday Daily Word digest).
-- PENDING — not yet run. Review, then run once in the Supabase SQL editor.
-- Idempotent. Only the server (service-role key) reads/writes this table:
-- RLS is on and there are no public policies, so the anon key cannot see it.

create table if not exists public.newsletter_subscribers (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,  -- stored lower-cased by the site
  status             text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  unsubscribe_token  uuid not null default gen_random_uuid(),
  source             text,
  created_at         timestamptz not null default now(),
  unsubscribed_at    timestamptz
);

create unique index if not exists newsletter_subscribers_token_key on public.newsletter_subscribers (unsubscribe_token);

alter table public.newsletter_subscribers enable row level security;
-- No policies on purpose: anon/authenticated get nothing; the service role bypasses RLS.
