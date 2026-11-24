# Partnership centre: release and verification

## Scope

The public partnership centre offers five owner-selected designations and weekly,
monthly or one-time commitments. Existing sign-in accounts work; a partner can also
create and confirm an account from the centre. Only the account owner can see their
commitments and giving history. Partnership does not confer a staff role.

Manual transfer notifications remain pending until an independent existing Treasury
officer checks the bank record. Retry IDs and unique bank references prevent duplicate
posting. The designated ledger appears within Treasury and must not be copied into
service collections. Totals keep currencies separate and subtract refunds/disputed
funds. The evangelism workspace links to the Salvation Challenge designation without
exposing donor records. Existing giving and Feed the Future pages link to the centre.

Automatic CAD/USD/EUR giving uses Stripe Checkout and the customer portal. NGN
commitments use manual transfers. Checkout reads the signed-in owner's saved amount,
currency, interval and designation rather than trusting browser payment parameters.
The return page never marks a gift paid. Signed webhooks record one-time payments and
paid subscription invoices; the first invoice is recorded once, not again at checkout.
Replayed events are idempotent and older subscription events cannot reopen a canceled
commitment. Refund/dispute events update available amounts; paid-event handling reads
current charge reversals to recover out-of-order delivery. Provider errors are retried.

## Feature gates and setup

Registration stays off unless `PARTNERSHIP_ENABLED=true`. The public page remains
readable and explains that registration is being prepared. Card actions require an
additional `PARTNERSHIP_STRIPE_ENABLED=true` plus all server payment configuration.
Do not enable either gate before the following checks.

1. Review and apply `supabase/migrations/20261124120000_partnership_centre.sql`
   through the approved database release process. Do not run a broad migration push:
   reconcile the pre-existing follow-up migration receipt first. This migration adds
   tables, RLS and bounded functions without changing existing Treasury policies.
2. Verify the application's Supabase URL and public key. Configure the server-only
   database administrative key in the deployment environment; never send it to browsers.
3. Confirm the receiving payment account belongs to the intended ministry/legal entity
   and supports the chosen currencies. No new account or paid product is created by
   this change. Confirm approved transfer instructions before accepting transfers.
4. Set `STRIPE_SECRET_KEY` to an appropriately restricted server payment key and
   `PARTNERSHIP_STRIPE_WEBHOOK_SECRET` to the signing secret for this endpoint.
   Configure `PARTNERSHIP_SITE_ORIGIN` to the approved HTTPS public site origin.
   Use a separate Stripe sandbox before live payment credentials.
5. Register the partnership webhook route with: checkout.session.completed,
   checkout.session.async_payment_succeeded, invoice.paid, invoice.payment_failed,
   customer.subscription.created, customer.subscription.updated,
   customer.subscription.deleted, customer.subscription.paused,
   customer.subscription.resumed, charge.refunded, charge.dispute.created,
   charge.dispute.closed. An expired checkout can be stopped with Stop pending checkout, then replaced by a new commitment;
   do not authorize a second subscription for the old commitment.
6. Configure the customer portal for payment-method updates and cancellation. Keep
   product/price switching disabled: amount, interval and project changes require
   canceling the old automatic commitment and saving a new one. Pending checkout cancellation expires the provider session before ending the local
   commitment, so its old authorization link cannot be reused. Direct dashboard
   price edits will fail amount matching rather than silently misallocate a receipt.
7. Test weekly, monthly and one-time payments in the sandbox, a declined/delayed
   payment, portal cancellation, refund, dispute and webhook retries. Configure the
   Supabase confirmation-email redirect allowlist for the partnership page and test
   actual email confirmation. Neither hosted sandbox checkout nor real email delivery
   is established by local fixtures.
8. Obtain the owner's live release approval, then enable registration. Enable automatic
   giving only after provider tests and webhook delivery are verified. Existing giving
   remains available while setup is incomplete. No reminder schedule or worker/member
   messages are activated by this release.

Payment acknowledgements are not a promise of a charitable tax receipt. No automatic
tax collection or tax registration was configured; confirm the receiving entity and
any applicable donation/tax treatment separately before enabling live billing.

## Local verification

`node scripts/test-partnership.mjs` checks payment payloads, weekly/monthly intervals,
allocation metadata, unpaid rejection, provider signature verification, duplicate paths
and disabled endpoints. `tests/partnership/bootstrap.sql`, the migration,
`security.sql` and `reversals.sql` run against a disposable Postgres database.
The browser fixture uses synthetic accounts and a localhost-only auth/REST adapter;
it does not use hosted credentials, live donor records or a payment provider.

To reproduce the browser fixture, run vanilla Postgres 17 in Docker, initialize the
SQL files in the order above, apply `browser-bootstrap.sql`, attach PostgREST 14 to
the same disposable database and expose it only on localhost port 3235. Set its JWT
secret to the fixture constant in `tests/partnership/serve-fixture.mjs` and use
`public` as the exposed schema. Run `node tests/partnership/serve-fixture.mjs`.
The app runs on port 3237; the synthetic auth adapter runs on port 3236. Fixture
accounts and the password are explicitly synthetic and exist only in that script.
The temporary administration test page must never be committed or deployed.

## Rollback

Disable new registration with `PARTNERSHIP_ENABLED=false`. Existing partners retain
sign-in, history and management; portal/webhook availability is independent of this
registration flag. Do not disable `PARTNERSHIP_STRIPE_ENABLED` while subscriptions
remain active. An application revert must retain the payment processor and portal
routes, or replace them with a verified retained processor before the revert. Preserve partnership tables, event receipts and financial history; do not
remove recorded gifts as part of rollback. Subscription cancellation is a separate
provider action: hiding the page or disabling the app does not stop existing debits.
Keep webhook processing operational while any subscriptions exist, or route verified
events to a retained processor before stopping it. A database migration rollback is
unnecessary for an application rollback.

## Costs

The manual-commitment path needs no additional software subscription. Existing
hosting/database limits and any bank-transfer fees still apply. Automatic Stripe
subscriptions incur payment-processing fees and may incur Stripe Billing fees.
Stripe's published Canadian pay-as-you-go Billing rate checked 24 November 2026 is
0.7% of Billing volume, in addition to applicable payment processing charges:
https://stripe.com/en-ca/billing/pricing . Confirm actual account pricing before
activation; no paid plan, payment destination or subscription has been created here.
