import { NextResponse } from "next/server";
import {
  partnershipPaymentsConfigured,
  authenticatedCommitment,
  siteOrigin,
  stripeClient,
} from "@/lib/partnership/server";
export async function POST(req: Request) {
  if (!partnershipPaymentsConfigured())
    return NextResponse.json(
      { error: "Automatic giving management is unavailable." },
      { status: 503 },
    );
  try {
    const { commitment: c } = await authenticatedCommitment(req);
    if (!c.stripe_customer_id) throw new Error("Not linked");
    const portal = await stripeClient().billingPortal.sessions.create({
      customer: c.stripe_customer_id,
      return_url: `${siteOrigin()}/partnership`,
    });
    return NextResponse.json({ url: portal.url });
  } catch {
    return NextResponse.json(
      { error: "Could not open your giving account. Sign in and retry." },
      { status: 400 },
    );
  }
}
