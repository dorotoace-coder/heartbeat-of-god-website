/**
 * Which giving methods are actually live. Read on the server at build/render
 * time. A method with neither a key nor a hosted link is hidden — the site
 * never shows a payment button that cannot take a payment.
 *
 * Env vars (set in Vercel → Project → Settings → Environment Variables):
 *   STRIPE_SECRET_KEY                 server-only; enables in-site Stripe Checkout (CAD/USD/EUR, one-time + monthly)
 *   NEXT_PUBLIC_STRIPE_PAYMENT_LINK   no-code fallback: a Stripe Payment Link URL
 *   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY   enables the Paystack inline popup for NGN cards
 *   NEXT_PUBLIC_PAYSTACK_PAYMENT_PAGE no-code fallback: a Paystack Payment Page URL
 *   NEXT_PUBLIC_INTERAC_EMAIL         shows Interac e-Transfer instructions (Canada)
 */

export type GivingConfig = {
  stripeCheckout: boolean;
  stripeLink: string | null;
  paystackKey: string | null;
  paystackPage: string | null;
  interacEmail: string | null;
};

function url(v: string | undefined): string | null {
  const s = v?.trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function paystackPublicKey(v: string | undefined): string | null {
  const s = v?.trim();
  if (!s || s.includes("placeholder")) return null;
  return /^pk_(live|test)_[A-Za-z0-9]+$/.test(s) ? s : null;
}

function email(v: string | undefined): string | null {
  const s = v?.trim();
  return s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

export function getGivingConfig(): GivingConfig {
  return {
    stripeCheckout: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    stripeLink: url(process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK),
    paystackKey: paystackPublicKey(process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY),
    paystackPage: url(process.env.NEXT_PUBLIC_PAYSTACK_PAYMENT_PAGE),
    interacEmail: email(process.env.NEXT_PUBLIC_INTERAC_EMAIL),
  };
}

/** Naira bank-transfer details (already published on the live /give page). */
export const NGN_BANK_DETAILS = {
  bankName: "Moniepoint",
  accountNumber: "5460639284",
  accountName: "Heartbeat of God Ministry",
};
