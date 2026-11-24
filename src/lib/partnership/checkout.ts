import type Stripe from "stripe";
import { areaTitle, minorAmount, type Commitment } from "./catalogue";
export function checkoutParameters(
  c: Commitment,
  email: string | undefined,
  origin: string,
  identifier: string,
): Stripe.Checkout.SessionCreateParams {
  if (
    c.method !== "stripe" ||
    !["CAD", "USD", "EUR"].includes(c.currency) ||
    !["weekly", "monthly", "once"].includes(c.frequency) ||
    !/^https?:\/\//.test(origin)
  )
    throw new Error("Invalid automatic commitment");
  const amount = minorAmount(c.amount);
  if (amount > 10000000)
    throw new Error(
      "Automatic gifts must be no more than 100,000 per payment.",
    );
  const recurring = c.frequency !== "once";
  const metadata = {
    commitment_id: c.id,
    project: c.project,
    source: "hbg-partnership",
  };
  return {
    mode: recurring ? "subscription" : "payment",
    customer_email: email,
    ...(!recurring ? { customer_creation: "always" } : {}),
    client_reference_id: c.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: c.currency.toLowerCase(),
          unit_amount: amount,
          ...(recurring
            ? {
                recurring: {
                  interval: c.frequency === "weekly" ? "week" : "month",
                },
              }
            : {}),
          product_data: {
            name: areaTitle(c.project),
            description: `${c.frequency === "once" ? "One-time" : c.frequency === "weekly" ? "Weekly" : "Monthly"} designated ministry support`,
          },
        },
      },
    ],
    ...(recurring
      ? { subscription_data: { metadata } }
      : { payment_intent_data: { metadata } }),
    metadata,
    integration_identifier: identifier,
    success_url: `${origin}/partnership?checkout=returned`,
    cancel_url: `${origin}/partnership?checkout=canceled`,
  };
}
