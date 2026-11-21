import { NextResponse } from "next/server";
import webpush from "web-push";
import { cronAuthorized } from "@/lib/cron";
import { isPushConfigured, vapidPublicKey, vapidSubject } from "@/lib/push";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getTodaysDailyWord } from "@/lib/dailyWordData";
import { translationOf } from "@/lib/dailyWord";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Pushes today's Daily Word to every subscribed browser.
 * Scheduled in vercel.json at 12:00 UTC = 7:00 AM America/Winnipeg
 * (Manitoba stays on UTC-5 year-round). Needs CRON_SECRET + the push vars;
 * otherwise it does nothing.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!isPushConfigured() || !db) return NextResponse.json({ skipped: "push not configured" });

  const word = await getTodaysDailyWord();
  if (!word) return NextResponse.json({ skipped: "no Daily Word published for today" });

  webpush.setVapidDetails(vapidSubject(), vapidPublicKey()!, process.env.VAPID_PRIVATE_KEY!.trim());

  const { ref, short } = translationOf(word.scripture_ref);
  const payload = JSON.stringify({
    title: `Daily Word · ${word.title}`,
    body: `${ref} (${short}) — ${word.scripture_text}`.slice(0, 180),
    url: `/daily-word/${word.slug}`,
    tag: `daily-word-${word.publish_date}`,
  });

  // Read every subscription first, so removing dead ones can't shift the pages.
  const subs: { endpoint: string; p256dh: string; auth: string }[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from("push_subscriptions").select("endpoint,p256dh,auth").range(from, from + PAGE - 1);
    if (error) {
      console.error("push_subscriptions read failed:", error.message);
      return NextResponse.json({ error: "read failed" }, { status: 500 });
    }
    subs.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  let sent = 0;
  let failed = 0;
  const gone: string[] = [];
  for (let i = 0; i < subs.length; i += 100) {
    const chunk = subs.slice(i, i + 100);
    const results = await Promise.allSettled(
      chunk.map((s) =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 12 }),
      ),
    );
    results.forEach((r, j) => {
      if (r.status === "fulfilled") sent++;
      else {
        const code = (r.reason as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) gone.push(chunk[j].endpoint);
        else failed++;
      }
    });
  }
  for (let i = 0; i < gone.length; i += 200) {
    await db.from("push_subscriptions").delete().in("endpoint", gone.slice(i, i + 200));
  }
  const removed = gone.length;

  return NextResponse.json({ ok: true, slug: word.slug, sent, removed, failed });
}
