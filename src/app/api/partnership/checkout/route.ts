import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  adminClient,
  automaticGivingEnabled,
  authenticatedCommitment,
  siteOrigin,
  stripeClient,
} from "@/lib/partnership/server";
import { type Commitment } from "@/lib/partnership/catalogue";
import { checkoutParameters } from "@/lib/partnership/checkout";
export async function POST(req: Request) {
  if (!automaticGivingEnabled())
    return NextResponse.json(
      { error: "Automatic partnership giving is not enabled yet." },
      { status: 503 },
    );
  try {
    const { commitment: c, user } = await authenticatedCommitment(req);
    if (c.state !== "active")
      return NextResponse.json(
        { error: "This commitment is not active." },
        { status: 409 },
      );
    const stripe = stripeClient();
    if (c.stripe_checkout_id) {
      const existing = await stripe.checkout.sessions.retrieve(
        c.stripe_checkout_id,
      );
      if (existing.status === "open" && existing.url)
        return NextResponse.json({ url: existing.url });
      return NextResponse.json(
        {
          error:
            "Checkout has already completed or expired. Refresh your giving history before continuing.",
        },
        { status: 409 },
      );
    }
    if (c.stripe_customer_id)
      return NextResponse.json(
        {
          error:
            "This commitment is already linked. Use Manage automatic giving.",
        },
        { status: 409 },
      );
    const identifier = `hbg_partnership_${createHash("sha256").update(c.id).digest().subarray(0, 8).reduce((text, byte) => text + String.fromCharCode(97 + byte % 26), "")}`;
    const session = await stripe.checkout.sessions.create(
      checkoutParameters(c as Commitment, user.email, siteOrigin(), identifier),
      { idempotencyKey: `partnership-${c.id}` },
    );
    const saved = await adminClient()
      .from("partnership_commitments")
      .update({ stripe_checkout_id: session.id })
      .eq("id", c.id)
      .eq("state", "active")
      .select("id")
      .single();
    if (saved.error) {
      await stripe.checkout.sessions.expire(session.id);
      throw new Error("Could not save checkout. Retry the same commitment.");
    }
    if (!session.url) throw new Error("Checkout unavailable.");
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not open checkout. Sign in, refresh your commitments and retry the same one.",
      },
      { status: 400 },
    );
  }
}
