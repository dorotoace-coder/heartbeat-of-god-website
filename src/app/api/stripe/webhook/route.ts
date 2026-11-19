import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { emailLayout, escapeHtml, isEmailConfigured, sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook → Monthly Partner thank-you email.
 *
 * Inert until STRIPE_WEBHOOK_SECRET is set (every call gets 503 and nothing
 * happens). The email itself also needs RESEND_API_KEY + NEWSLETTER_FROM;
 * without them the event is acknowledged and no email is sent.
 *
 * Stripe → Developers → Webhooks → endpoint https://heartbeatofgod.ca/api/stripe/webhook,
 * event: checkout.session.completed. Copy its signing secret (whsec_…) into
 * STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    // The secret key isn't needed to verify signatures; a placeholder keeps the client happy if it's unset.
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY?.trim() || "sk_unset", { apiVersion: "2026-04-22.dahlia" });
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature check failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const isPartner = session.mode === "subscription" || session.metadata?.frequency === "Monthly Partner";
    const email = session.customer_details?.email || session.customer_email;
    if (isPartner && email && isEmailConfigured()) {
      const name = session.customer_details?.name?.trim().split(/\s+/)[0] || null;
      const amount =
        typeof session.amount_total === "number" && session.currency
          ? new Intl.NumberFormat("en-CA", { style: "currency", currency: session.currency.toUpperCase() }).format(session.amount_total / 100)
          : null;
      const result = await sendEmail(partnerThankYou(email, name, amount));
      if (!result.ok && !result.skipped) console.error("Partner thank-you email failed:", result.error);
    }
  }

  return NextResponse.json({ received: true });
}

function partnerThankYou(to: string, firstName: string | null, amount: string | null) {
  const greeting = firstName ? `Dear ${escapeHtml(firstName)},` : "Dear Partner,";
  const amountLine = amount ? ` of ${escapeHtml(amount)} each month` : "";
  const body = `
<h1 style="margin:0 0 16px;font-family:Newsreader,Georgia,serif;font-weight:400;font-size:28px;color:#1C0A2D;">Thank you for partnering with us</h1>
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">Thank you for becoming a Monthly Partner with Heartbeat of God Ministry. Your gift${amountLine} helps carry the message of God’s presence further. Stripe will send your receipt separately.</p>
<p style="margin:0 0 24px;font-style:italic;color:#574F62;">“God loveth a cheerful giver.” — 2 Corinthians 9:7 (KJV)</p>
<p style="margin:0 0 24px;"><a href="${SITE_URL}/daily-word" style="display:inline-block;background:#D9B45A;color:#0E0716;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px;">Read today’s Daily Word</a></p>
<p style="margin:0;">With gratitude,<br>Heartbeat of God Ministry</p>`;
  return {
    to,
    subject: "Thank you for partnering with Heartbeat of God",
    html: emailLayout({ preheader: "Thank you for becoming a Monthly Partner.", bodyHtml: body }),
    text: `${firstName ? `Dear ${firstName},` : "Dear Partner,"}\n\nThank you for becoming a Monthly Partner with Heartbeat of God Ministry. Your gift${amount ? ` of ${amount} each month` : ""} helps carry the message of God's presence further. Stripe will send your receipt separately.\n\n"God loveth a cheerful giver." — 2 Corinthians 9:7 (KJV)\n\nWith gratitude,\nHeartbeat of God Ministry\n${SITE_URL}`,
  };
}
