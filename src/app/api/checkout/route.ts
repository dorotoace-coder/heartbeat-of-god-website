import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const CURRENCIES = new Set(["CAD", "USD", "EUR"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates a Stripe Checkout session for /give.
 * Requires STRIPE_SECRET_KEY. Without it the /give page hides this flow and
 * (if set) uses NEXT_PUBLIC_STRIPE_PAYMENT_LINK instead, so this 503 should
 * never be reachable from the UI.
 */
export async function POST(req: NextRequest) {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    return NextResponse.json({ error: "Card giving is not available right now." }, { status: 503 });
  }

  let body: { amount?: unknown; currency?: unknown; email?: unknown; frequency?: unknown; label?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const amount = Number(body.amount);
  const currency = String(body.currency || "").toUpperCase();
  const email = String(body.email || "").trim();
  const frequency = body.frequency === "Monthly Partner" ? "Monthly Partner" : "One Time";
  const label = typeof body.label === "string" ? body.label.slice(0, 80) : "Kingdom Offering";

  if (!Number.isFinite(amount) || amount < 1 || amount > 100000) {
    return NextResponse.json({ error: "Please enter an amount between 1 and 100,000." }, { status: 400 });
  }
  if (!CURRENCIES.has(currency)) {
    return NextResponse.json({ error: "Unsupported currency." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email for your receipt." }, { status: 400 });
  }

  const stripe = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  const origin = req.headers.get("origin") || req.nextUrl.origin || "https://heartbeatofgod.ca";
  const unit_amount = Math.round(amount * 100);
  const isRecurring = frequency === "Monthly Partner";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: isRecurring ? "subscription" : "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount,
            ...(isRecurring ? { recurring: { interval: "month" as const } } : {}),
            product_data: isRecurring
              ? { name: "HBG Monthly Partner", description: "Monthly Kingdom Partnership — Heartbeat of God Ministry" }
              : { name: `HBG Ministry — ${label}`, description: "Thank you for partnering with the Heartbeat of God." },
          },
        },
      ],
      success_url: `${origin}/give?success=1`,
      cancel_url: `${origin}/give`,
      metadata: { label, frequency },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
