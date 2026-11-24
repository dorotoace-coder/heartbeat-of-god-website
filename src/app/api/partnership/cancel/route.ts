import { NextResponse } from "next/server";
import {
  adminClient,
  authenticatedCommitment,
  partnershipPaymentsConfigured,
  stripeClient,
} from "@/lib/partnership/server";
/** End an uncompleted checkout without leaving an authorization link usable. */
export async function POST(req: Request) {
  if (!partnershipPaymentsConfigured())
    return NextResponse.json(
      { error: "Automatic giving management is unavailable." },
      { status: 503 },
    );
  try {
    const { commitment: c } = await authenticatedCommitment(req);
    if (c.stripe_customer_id || c.stripe_subscription_id)
      return NextResponse.json(
        {
          error:
            "Use Manage automatic giving to stop an existing subscription.",
        },
        { status: 409 },
      );
    if (c.stripe_checkout_id) {
      const stripe = stripeClient();
      const session = await stripe.checkout.sessions.retrieve(
        c.stripe_checkout_id,
      );
      if (session.status === "complete")
        return NextResponse.json(
          {
            error:
              "Payment is being processed. Refresh your history before continuing.",
          },
          { status: 409 },
        );
      if (session.status === "open")
        await stripe.checkout.sessions.expire(session.id);
    }
    let query = adminClient()
      .from("partnership_commitments")
      .update({ state: "ended", provider_status: "checkout_canceled" })
      .eq("id", c.id)
      .is("stripe_customer_id", null)
      .is("stripe_subscription_id", null);
    query = c.stripe_checkout_id
      ? query.eq("stripe_checkout_id", c.stripe_checkout_id)
      : query.is("stripe_checkout_id", null);
    const result = await query.select("id").single();
    if (result.error) throw result.error;
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not stop the pending checkout. Refresh and retry; no second commitment should be started yet.",
      },
      { status: 409 },
    );
  }
}
