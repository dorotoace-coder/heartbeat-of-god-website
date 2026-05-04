import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const { amount, currency, email, frequency, label } = await req.json();

  if (!amount || !currency || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const isRecurring = frequency === "Monthly Partner";
  const origin = req.headers.get("origin") || "https://www.heartbeatofgod.ca";

  try {
    if (isRecurring) {
      // For monthly giving — create a subscription via Stripe Checkout
      const priceData = {
        currency: currency.toLowerCase(),
        unit_amount: Math.round(amount * 100),
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
        metadata: { label: label || "Monthly Partner", frequency },
      });

      return NextResponse.json({ url: session.url });
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
              currency: currency.toLowerCase(),
              unit_amount: Math.round(amount * 100),
              product_data: {
                name: `HBG Ministry — ${label || "Kingdom Offering"}`,
                description: "Thank you for partnering with the Heartbeat of God.",
              },
            },
          },
        ],
        success_url: `${origin}/give?success=1`,
        cancel_url: `${origin}/give`,
        metadata: { label: label || "One Time", frequency },
      });

      return NextResponse.json({ url: session.url });
    }
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
