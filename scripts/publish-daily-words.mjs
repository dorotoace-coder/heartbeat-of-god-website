// Upserts every entry in data/clt-daily-words.json into the `daily_words`
// table via the Supabase REST API. Run by the `publish-daily-word` GitHub
// Action after the midnight CLT job appends a day's entry to the queue.
// Idempotent: upserts on `slug` (the table's unique key), so re-running
// after a partial failure or a re-push is safe.
//
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
// (GitHub repo secrets — never commit them). Node 20+ (global fetch, no
// dependencies).
import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const entries = JSON.parse(readFileSync("data/clt-daily-words.json", "utf8"));
if (!Array.isArray(entries) || entries.length === 0) {
  console.log("Queue is empty — nothing to publish.");
  process.exit(0);
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
for (const e of entries) {
  if (!e.slug || !SLUG_RE.test(e.slug)) throw new Error(`Bad slug: ${e.slug}`);
  for (const f of ["publish_date", "title", "scripture_ref", "scripture_text"]) {
    if (!e[f]) throw new Error(`Entry ${e.slug} is missing ${f}.`);
  }
  if (e.published !== true) throw new Error(`Entry ${e.slug} is not marked published.`);
}

const base = url.replace(/\/$/, "");
const res = await fetch(`${base}/rest/v1/daily_words`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=representation",
  },
  body: JSON.stringify(entries),
});
if (!res.ok) {
  console.error(`Upsert failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
const rows = await res.json();
console.log(`Upserted ${rows.length} Daily Word ${rows.length === 1 ? "entry" : "entries"}:`);
for (const r of rows) console.log(`- ${r.publish_date} ${r.slug} (published=${r.published})`);

// Verify each slug reads back as published.
for (const e of entries) {
  const check = await fetch(
    `${base}/rest/v1/daily_words?slug=eq.${encodeURIComponent(e.slug)}&select=slug,publish_date,published`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  const found = await check.json();
  if (!Array.isArray(found) || found.length === 0 || found[0].published !== true) {
    console.error(`Verify failed for ${e.slug}`);
    process.exit(1);
  }
}
console.log("All entries verified live in daily_words.");
