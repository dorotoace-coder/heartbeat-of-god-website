# Daily Word queue — CLT devotionals

`clt-daily-words.json` is the queue of daily CLT devotionals waiting to be
published into the `daily_words` table (Supabase), where the site's Daily
Word library reads them. One entry per day, newest last. Each entry is a
full `daily_words` row: `slug` (`YYYY-MM-DD-<title-slug>`), `publish_date`,
`title`, `scripture_ref` (CLT entries keep their ` NKJV` suffix — the site
reads the version from the suffix), `scripture_text`, `devotional`
(markdown, 7 headed sections + "— Pastor Amos" sign-off), `image_url`,
`instagram_url`, `tiktok_url`, `youtube_url`, `published: true`.

## How an entry gets published

1. The midnight CLT job appends today's entry (built from the day's spec
   JSON by `~/workspace/hbg-clt/publish_daily_word.py`) and pushes this
   file to `main`.
2. The `publish-daily-word` GitHub Action (`.github/workflows/`) runs
   `scripts/publish-daily-words.mjs`, which upserts every entry into
   Supabase (upsert on `slug`, so re-running is safe).
3. The site picks the new row up on its own — pages revalidate hourly
   (ISR), so the homepage's Word of the Day and the `/daily-word` archive
   show it within about an hour. No redeploy is needed.

## Secrets (repo Settings → Secrets and variables → Actions)

- `SUPABASE_URL` — the Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — the service-role key (Supabase Dashboard →
  Settings → API). It bypasses row-level security, so it lives only as a
  repo secret and is never committed anywhere.

## Images

`image_url` is `null` for CLT entries. The chalice image stays on
WhatsApp / Instagram / Facebook. There is no upload path in this repo
(no storage bucket); to show the chalice image on the site, host the JPG
somewhere public and set `image_url` to its `https://` URL — e.g. commit
it under `public/devotionals/` and use
`https://heartbeatofgod.ca/devotionals/clt-YYYY-MM-DD-chalice.jpg`.
