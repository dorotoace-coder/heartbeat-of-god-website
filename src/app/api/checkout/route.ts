import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const ALLOWED_CURRENCIES = new Set(["cad", "usd", "eur"]);
const ALLOWED_FREQUENCIES = new Set(["One Time", "Monthly Partner"]);
const MAX_DONATION_AMOUNT = 1_000_000;

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Giving records are not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
  });

  let requestBody: unknown;
  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!requestBody || typeof requestBody !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { amount, currency, email, frequency } = requestBody as Record<string, unknown>;
  const numericAmount = typeof amount === "number" ? amount : Number.NaN;
  const normalizedCurrency = typeof currency === "string" ? currency.toLowerCase() : "";

  if (
    !Number.isFinite(numericAmount)
    || numericAmount <= 0
    || numericAmount > MAX_DONATION_AMOUNT
    || !ALLOWED_CURRENCIES.has(normalizedCurrency)
    || !isValidEmail(email)
    || typeof frequency !== "string"
    || !ALLOWED_FREQUENCIES.has(frequency)
  ) {
    return NextResponse.json({ error: "Invalid checkout details" }, { status: 400 });
  }

  const isRecurring = frequency === "Monthly Partner";
  const origin = new URL(req.url).origin;
  const label = isRecurring ? "Monthly Kingdom Partner" : "Kingdom Offering";

  try {
    if (isRecurring) {
      // For monthly giving — create a subscription via Stripe Checkout
      const priceData = {
        currency: normalizedCurrency,
        unit_amount: Math.round(numericAmount * 100),
        recurring: { interval: "month" as const },
        product_data: {
          name: "HBG Monthly Partner",
          description: "Monthly Kingdom Partnership — Heartbeat of God Ministry",
        },
      };

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        customer_email: email,
        line_items: [{ price_data: priceData, quantity: 1 }],
        success_url: `${origin}/give?success=1`,
        cancel_url: `${origin}/give`,
        metadata: { label, frequency },
      });

      if (!session.url) {
        return NextResponse.json({ error: "Checkout unavailable" }, { status: 502 });
      }
      const { error } = await supabase.from("donations").insert({
        currency: normalizedCurrency.toUpperCase(),
        amount: numericAmount,
        frequency,
        payment_method: "Stripe Checkout",
        status: "pending",
        reference: session.id,
        donor_email: email,
      });
      if (error) {
        return NextResponse.json({ error: "Unable to prepare a tracked donation. No payment was taken." }, { status: 503 });
      }
      return NextResponse.json({ url: session.url, sessionId: session.id });
    } else {
      // One-time giving
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: normalizedCurrency,
              unit_amount: Math.round(numericAmount * 100),
              product_data: {
                name: `HBG Ministry — ${label}`,
                description: "Thank you for partnering with the Heartbeat of God.",
              },
            },
          },
        ],
        success_url: `${origin}/give?success=1`,
        cancel_url: `${origin}/give`,
        metadata: { label, frequency },
      });

      if (!session.url) {
        return NextResponse.json({ error: "Checkout unavailable" }, { status: 502 });
      }
      const { error } = await supabase.from("donations").insert({
        currency: normalizedCurrency.toUpperCase(),
        amount: numericAmount,
        frequency,
        payment_method: "Stripe Checkout",
        status: "pending",
        reference: session.id,
        donor_email: email,
      });
      if (error) {
        return NextResponse.json({ error: "Unable to prepare a tracked donation. No payment was taken." }, { status: 503 });
      }
      return NextResponse.json({ url: session.url, sessionId: session.id });
    }
  } catch {
    console.error("Stripe checkout session creation failed.");
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
