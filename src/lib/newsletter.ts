/**
 * Newsletter: subscriber storage, welcome email and the Monday digest.
 *
 * Storage needs SUPABASE_SERVICE_ROLE_KEY + the newsletter_subscribers table
 * (supabase/migrations-pending/newsletter.sql). Until then sign-ups keep
 * landing in `inquiries` exactly as before, and no email is sent.
 * Email needs RESEND_API_KEY + NEWSLETTER_FROM (see src/lib/email.ts).
 */
import { getSupabaseAdmin } from "./supabaseAdmin";
import { supabase, isSupabaseConfigured } from "./supabase";
import { emailLayout, escapeHtml, isEmailConfigured, sendEmail, type EmailMessage } from "./email";
import { SITE_URL } from "./site";
import { excerpt, formatPublishDate, translationOf, type DailyWordSummary } from "./dailyWord";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function unsubscribeUrl(token: string): string {
  return `${SITE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

function unsubscribeHeaders(token: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(token)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export type SubscribeResult = { ok: boolean; stored: "subscribers" | "inquiries" | null; welcomed: boolean };

export async function subscribe(rawEmail: string, source = "website"): Promise<SubscribeResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, stored: null, welcomed: false };

  const db = getSupabaseAdmin();
  if (db) {
    const { data, error } = await db
      .from("newsletter_subscribers")
      .upsert({ email, status: "subscribed", unsubscribed_at: null, source }, { onConflict: "email" })
      .select("unsubscribe_token")
      .single();
    if (!error && data) {
      let welcomed = false;
      if (isEmailConfigured()) {
        const r = await sendEmail(welcomeEmail(email, data.unsubscribe_token as string));
        welcomed = r.ok;
      }
      return { ok: true, stored: "subscribers", welcomed };
    }
    // Table not created yet (or another DB error) — fall back to the old path.
    console.error("newsletter_subscribers upsert failed, using inquiries:", error?.message);
  }

  if (!isSupabaseConfigured) return { ok: false, stored: null, welcomed: false };
  const { error } = await supabase.from("inquiries").insert([
    { full_name: "Newsletter subscriber", email, type: "Newsletter Signup", message: "Please add me to ministry updates." },
  ]);
  return { ok: !error, stored: error ? null : "inquiries", welcomed: false };
}

export async function unsubscribe(token: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db || !/^[0-9a-f-]{36}$/i.test(token)) return false;
  const { data, error } = await db
    .from("newsletter_subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("id");
  return !error && (data?.length ?? 0) > 0;
}

function welcomeEmail(email: string, token: string): EmailMessage {
  const body = `
<h1 style="margin:0 0 16px;font-family:Newsreader,Georgia,serif;font-weight:400;font-size:28px;color:#1C0A2D;">Welcome to the Heartbeat of God family</h1>
<p style="margin:0 0 16px;">Thank you for subscribing to ministry updates from Heartbeat of God. Each Monday you’ll receive the past week’s Daily Word in one email.</p>
<p style="margin:0 0 24px;">You can read every Daily Word any time at heartbeatofgod.ca.</p>
<p style="margin:0;"><a href="${SITE_URL}/daily-word" style="display:inline-block;background:#D9B45A;color:#0E0716;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px;">Read the Daily Word</a></p>`;
  return {
    to: email,
    subject: "Welcome to Heartbeat of God",
    html: emailLayout({
      preheader: "You’re subscribed to Heartbeat of God updates.",
      bodyHtml: body,
      footerHtml: `<a href="${unsubscribeUrl(token)}" style="color:#574F62;">Unsubscribe</a>`,
    }),
    text: `Welcome to the Heartbeat of God family.\n\nThank you for subscribing to ministry updates from Heartbeat of God. Each Monday you'll receive the past week's Daily Word in one email.\n\nRead the Daily Word: ${SITE_URL}/daily-word\n\nUnsubscribe: ${unsubscribeUrl(token)}`,
    headers: unsubscribeHeaders(token),
  };
}

/** One digest email for one subscriber. */
export function digestEmail(email: string, token: string, words: DailyWordSummary[]): EmailMessage {
  const items = words
    .map((w) => {
      const { ref, short } = translationOf(w.scripture_ref);
      const url = `${SITE_URL}/daily-word/${w.slug}`;
      return `
<tr><td style="padding:0 0 24px;">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8A6A1F;font-weight:700;">${escapeHtml(formatPublishDate(w.publish_date))}</p>
<p style="margin:0 0 6px;font-family:Newsreader,Georgia,serif;font-size:22px;line-height:1.3;"><a href="${url}" style="color:#1C0A2D;text-decoration:none;">${escapeHtml(w.title)}</a></p>
<p style="margin:0 0 6px;font-style:italic;color:#574F62;">${escapeHtml(ref)} (${short})</p>
<p style="margin:0 0 8px;color:#1C0A2D;">${escapeHtml(excerpt(w.devotional, 220))}</p>
<a href="${url}" style="color:#8A6A1F;font-weight:600;">Read the full Word →</a>
</td></tr>`;
    })
    .join("");
  const body = `
<h1 style="margin:0 0 8px;font-family:Newsreader,Georgia,serif;font-weight:400;font-size:28px;color:#1C0A2D;">This week’s Daily Word</h1>
<p style="margin:0 0 28px;color:#574F62;">The past seven days from Heartbeat of God.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items}</table>`;
  const text = words
    .map((w) => `${formatPublishDate(w.publish_date)}\n${w.title}\n${translationOf(w.scripture_ref).ref}\n${SITE_URL}/daily-word/${w.slug}`)
    .join("\n\n");
  return {
    to: email,
    subject: `This week’s Daily Word — ${words[0]?.title ?? "Heartbeat of God"}`,
    html: emailLayout({
      preheader: words.map((w) => w.title).join(" · ").slice(0, 140),
      bodyHtml: body,
      footerHtml: `You’re receiving this because you subscribed at heartbeatofgod.ca. <a href="${unsubscribeUrl(token)}" style="color:#574F62;">Unsubscribe</a>`,
    }),
    text: `This week's Daily Word\n\n${text}\n\nUnsubscribe: ${unsubscribeUrl(token)}`,
    headers: unsubscribeHeaders(token),
  };
}
