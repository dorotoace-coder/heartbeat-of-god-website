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

Naira bank transfer is always available (details in `src/lib/giving.ts`).

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


