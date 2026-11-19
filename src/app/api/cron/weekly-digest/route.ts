import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron";
import { isEmailConfigured, sendBatch } from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { digestEmail } from "@/lib/newsletter";
import { todayISO, type DailyWordSummary } from "@/lib/dailyWord";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COLS = "id,slug,publish_date,title,scripture_ref,scripture_text,devotional,image_url";

/**
 * Monday digest: the last 7 published Daily Words to every subscriber.
 * Scheduled in vercel.json for Mondays 12:00 UTC (7:00 AM Winnipeg).
 * Needs CRON_SECRET, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY and
 * NEWSLETTER_FROM; otherwise it does nothing.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  if (!db || !isEmailConfigured()) return NextResponse.json({ skipped: "newsletter not configured" });

  const today = todayISO();
  const weekAgo = new Date(new Date(`${today}T12:00:00Z`).getTime() - 6 * 86400000).toISOString().slice(0, 10);
  const { data: words, error: wErr } = await db
    .from("daily_words")
    .select(COLS)
    .eq("published", true)
    .gte("publish_date", weekAgo)
    .lte("publish_date", today)
    .order("publish_date", { ascending: false })
    .limit(7);
  if (wErr) return NextResponse.json({ error: "daily_words read failed" }, { status: 500 });
  if (!words?.length) return NextResponse.json({ skipped: "no Daily Words in the last 7 days" });

  const subs: { email: string; unsubscribe_token: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("newsletter_subscribers")
      .select("email,unsubscribe_token")
      .eq("status", "subscribed")
      .range(from, from + 999);
    if (error) return NextResponse.json({ error: "newsletter_subscribers read failed" }, { status: 500 });
    subs.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  if (!subs.length) return NextResponse.json({ skipped: "no subscribers" });

  const result = await sendBatch(subs.map((s) => digestEmail(s.email, s.unsubscribe_token, words as DailyWordSummary[])));
  return NextResponse.json({ ok: true, words: words.length, ...result });
}
