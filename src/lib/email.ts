/**
 * Transactional + newsletter email through Resend's HTTP API (no SDK).
 * Inert until both are set:
 *
 *   RESEND_API_KEY    server-only Resend API key
 *   NEWSLETTER_FROM   verified sender, e.g. "Heartbeat of God <noreply@heartbeatofgod.ca>"
 *
 * Without them every send is skipped and reported as { skipped: true }.
 */
import { MINISTRY_EMAIL, SITE_URL } from "./site";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
};

type SendResult = { ok: boolean; skipped?: boolean; error?: string };

function config(): { key: string; from: string } | null {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.NEWSLETTER_FROM?.trim();
  return key && from ? { key, from } : null;
}

export function isEmailConfigured(): boolean {
  return config() !== null;
}

function payload(m: EmailMessage, from: string) {
  return { from, to: [m.to], reply_to: MINISTRY_EMAIL, subject: m.subject, html: m.html, text: m.text, headers: m.headers };
}

export async function sendEmail(m: EmailMessage): Promise<SendResult> {
  const c = config();
  if (!c) return { ok: false, skipped: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${c.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload(m, c.from)),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { ok: false, error: `Resend HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}

/** Up to 100 messages per Resend batch call; chunks larger lists. */
export async function sendBatch(messages: EmailMessage[]): Promise<{ sent: number; failed: number; skipped: boolean }> {
  const c = config();
  if (!c) return { sent: 0, failed: 0, skipped: true };
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${c.key}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk.map((m) => payload(m, c.from))),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) sent += chunk.length;
      else failed += chunk.length;
    } catch {
      failed += chunk.length;
    }
  }
  return { sent, failed, skipped: false };
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Shared email shell in the site's palette (ink #0E0716, plum #1C0A2D,
 * gold #D9B45A, ivory #FAF7F2). Table layout + inline styles for mail clients.
 */
export function emailLayout({ preheader, bodyHtml, footerHtml = "" }: { preheader: string; bodyHtml: string; footerHtml?: string }): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Heartbeat of God</title></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Manrope,Segoe UI,Helvetica,Arial,sans-serif;color:#1C0A2D;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #ece6da;">
<tr><td align="center" style="background:#0E0716;padding:28px 24px;">
<a href="${SITE_URL}" style="text-decoration:none;"><img src="${SITE_URL}/hbg-logo.png" width="72" alt="Heartbeat of God" style="display:block;border:0;height:auto;"></a>
<p style="margin:12px 0 0;font-family:Newsreader,Georgia,serif;font-style:italic;font-size:20px;color:#ffffff;">Heartbeat of God</p>
</td></tr>
<tr><td style="padding:32px 28px;font-size:16px;line-height:1.6;color:#1C0A2D;">${bodyHtml}</td></tr>
<tr><td style="padding:20px 28px;background:#FAF7F2;font-size:12px;line-height:1.6;color:#574F62;text-align:center;">
<a href="${SITE_URL}" style="color:#8A6A1F;">heartbeatofgod.ca</a> · <a href="mailto:${MINISTRY_EMAIL}" style="color:#8A6A1F;">${MINISTRY_EMAIL}</a>${footerHtml ? `<br>${footerHtml}` : ""}
</td></tr>
</table></td></tr></table></body></html>`;
}
