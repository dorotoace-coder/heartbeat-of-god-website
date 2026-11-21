# Heartbeat of God — heartbeatofgod.ca

Next.js 16 (app router) · React 19 · Tailwind 4 · framer-motion · Supabase · Stripe · Paystack.

## Environment variables (Vercel → Settings → Environment Variables)

Nothing below is committed. Every payment method is hidden on `/give` until its variable is set, so the site never shows a button that can't take a payment. `NEXT_PUBLIC_*` values are baked in at build time: redeploy after changing them.

| Variable | Needed for | Required? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Contact / prayer / first-timer / department forms, newsletter, donation notifications, events, departments, media, Feed the Future report | Yes |
| `STRIPE_SECRET_KEY` | In-site card checkout (CAD/USD/EUR, one-time + monthly) via `/api/checkout` | One of these two to show the Card tab |
| `NEXT_PUBLIC_STRIPE_PAYMENT_LINK` | No-code card giving: a Stripe Payment Link URL | ↑ (also used as fallback if checkout fails) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack inline popup for Naira card payments (`pk_live_…`) | One of these two to show Naira card option |
| `NEXT_PUBLIC_PAYSTACK_PAYMENT_PAGE` | No-code Naira card giving: a Paystack Payment Page URL | ↑ |
| `NEXT_PUBLIC_INTERAC_EMAIL` | Interac e-Transfer tab (Canada) | Optional |
| `NEXT_PUBLIC_CONTACT_PHONE` | Phone line on `/connect` | Optional |
| `NEXT_PUBLIC_WHATSAPP_CHANNEL_URL` | "Follow on WhatsApp" button in the Follow HBG block (home, Daily Word). Must be an `https://` WhatsApp Channel link; hidden when unset | Optional |
| `YOUTUBE_API_KEY` | Optional. Confirms the live check with the YouTube Data API (and is the fallback if the public `/live` page check is blocked). Without it the keyless page check is used | Optional |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Daily Word push subscriptions, newsletter subscribers, Monday digest. Never prefix with `NEXT_PUBLIC_` | For push + newsletter |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Daily Word push notifications (generate once: `npx web-push generate-vapid-keys`). The bell button stays hidden until both are set **and** the service-role key is set | For push |
| `VAPID_SUBJECT` | Contact for push services (`mailto:` or `https://`). Defaults to the public ministry inbox | Optional |
| `CRON_SECRET` | Protects `/api/cron/*`. Vercel Cron sends it automatically; without it both cron routes refuse every call | For push + digest |
| `RESEND_API_KEY`, `NEWSLETTER_FROM` | Newsletter welcome email, Monday digest and the Monthly Partner thank-you. `NEWSLETTER_FROM` is a sender on a domain verified in Resend, e.g. `Heartbeat of God <noreply@heartbeatofgod.ca>` | For any email |
| `STRIPE_WEBHOOK_SECRET` | `/api/stripe/webhook` (Monthly Partner thank-you). Returns 503 and does nothing until set | For partner email |

Naira bank transfer is always available (details in `src/lib/giving.ts`).

## Reach features (live banner, app install, push, newsletter, podcast)

Every feature below stays hidden or inert until its variables (table above) are set.

- **Live now banner** — `/api/live` checks whether YouTube channel `@HBG_tv` is live right now (public `/live` page, cached 2 minutes; `YOUTUBE_API_KEY` optional). When it is, a slim "LIVE NOW on HBG TV — Join" bar shows under the nav on every page and `/watch` embeds that live video. Admin pulse (`/api/pulse`) uses the same check instead of a clock guess. No variables required.
- **Install as app** — `src/app/manifest.ts` + `public/sw.js` (offline page only, nothing else cached) + Apple web-app meta. Icons in `public/icons/` are the existing `/hbg-logo.png` centred on the ink background. No variables required.
- **Daily Word push** — bell button in the footer and on `/daily-word`. Subscriptions go to `push_subscriptions`; `/api/cron/daily-word-push` sends today's Daily Word at 12:00 UTC = 7:00 AM Winnipeg (`vercel.json`). Needs `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` and the SQL in `supabase/migrations-pending/push.sql`. On iPhone, push works only after "Add to Home Screen" (iOS 16.4+).
- **Newsletter** — the footer form posts to `/api/newsletter/subscribe`. With `SUPABASE_SERVICE_ROLE_KEY` + `supabase/migrations-pending/newsletter.sql` it stores the subscriber in `newsletter_subscribers` (otherwise it keeps writing to `inquiries` as before). With `RESEND_API_KEY` + `NEWSLETTER_FROM` it sends a welcome email, and `/api/cron/weekly-digest` (Mondays 12:00 UTC) emails the last 7 Daily Words. Every email has an unsubscribe link (`/api/newsletter/unsubscribe`, one-click supported).
- **Sermon podcast** — `/podcast.xml` (RSS 2.0 + iTunes) lists every `sermons` row with an `https://` `audio_url`. Cover art: `public/podcast-cover.jpg`. Submit the feed URL to Apple Podcasts / Spotify for Podcasters. "Listen as a podcast" link on `/media`.
- **Partner thank-you** — Stripe webhook `/api/stripe/webhook` (event `checkout.session.completed`) emails a thank-you to new Monthly Partners. Needs `STRIPE_WEBHOOK_SECRET`, plus `RESEND_API_KEY` + `NEWSLETTER_FROM` for the email. Amounts and bank details are unchanged.

SQL in `supabase/migrations-pending/` has **not** been run. Review it, then run it in the Supabase SQL editor.

## Analytics

`@vercel/analytics` and `@vercel/speed-insights` are mounted in `src/app/layout.tsx`. They collect nothing until **Web Analytics** and **Speed Insights** are enabled for this project in the Vercel dashboard (Project → Analytics → Enable, and Project → Speed Insights → Enable). No cookies, no env vars.

## Daily Word library

- Public: `/daily-word` (archive, newest first, search, pagination) and `/daily-word/<slug>` (post with share buttons, prev/next, Article JSON-LD and a generated Open Graph image).
- Admin: `/admin?view=dailyword` (manager, pastor or owner). Slug is auto-built from date + title. A post is public once `published = true` **and** its `publish_date` has arrived (America/Winnipeg calendar day), so future dates act as scheduling.
- Home "Word of the Day" shows today's published Daily Word; otherwise it keeps the local KJV rotation in `src/lib/scripture.ts`.
- With no published posts, `/daily-word` shows a "first Daily Word is coming soon" state with follow links. No devotional content ships in the code.

## YouTube feed

"Latest from HBG TV" (home, `/media`) and the latest upload on `/watch` read the channel's public RSS feed (`YOUTUBE_FEED_URL` in `src/lib/site.ts`), cached for one hour. If the feed fails the sections hide themselves.

## Database

Run `src/lib/schema.sql` in the Supabase SQL editor (idempotent). It adds `donations.donor_email/donor_name`, the `feed_the_future_reports` table, and the `daily_words` table with its RLS policies (public reads published rows; writes need a `profiles.role` of owner, pastor or manager; deletes need owner or pastor). The Feed the Future stats block appears only once a row with `published = true` exists.

## Editing content

- Headline event (TRIBE X etc.): `src/config/currentEvent.ts`
- Service times, socials, public email, YouTube channel, Zoom link: `src/lib/site.ts`
- Word of the Day fallback verses (KJV, rotates daily): `src/lib/scripture.ts`
- Daily Words: admin dashboard → Daily Word

## Before committing

```bash
git config core.hooksPath .githooks   # once per clone
bash scripts/check-public-safe.sh
npm run lint && npm run build
```

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


