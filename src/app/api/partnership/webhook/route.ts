import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  adminClient,
  partnershipPaymentsConfigured,
  stripeClient,
} from "@/lib/partnership/server";
import { paymentCommand } from "@/lib/partnership/events";
const objectId = (value: unknown) =>
  typeof value === "string"
    ? value
    : value && typeof value === "object" && "id" in value
      ? String(value.id)
      : null;
export async function POST(req: Request) {
  if (!partnershipPaymentsConfigured())
    return NextResponse.json(
      { error: "Partnership webhook unavailable." },
      { status: 503 },
    );
  const stripe = stripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await req.text(),
      req.headers.get("stripe-signature") || "",
      process.env.PARTNERSHIP_STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }
  try {
    const db = adminClient();
    if (
      [
        "charge.refunded",
        "charge.dispute.created",
        "charge.dispute.closed",
      ].includes(event.type)
    ) {
      const object = event.data.object as Stripe.Charge | Stripe.Dispute;
      const payment = objectId(object.payment_intent);
      if (payment) {
        const receipt = await db
          .from("partnership_gifts")
          .select("id")
          .eq("payment_intent_id", payment)
          .maybeSingle();
        if (receipt.error) throw receipt.error;
        // If the receipt has not arrived, the later paid handler reads the current charge
        // so refund/dispute state is recovered even when provider events arrive out of order.
        if (receipt.data) {
          const result = await db.rpc("sync_partnership_reversal", {
            p_event: event.id,
            p_event_at: event.created,
            p_payment: payment,
            p_refunded:
              event.type === "charge.refunded"
                ? (object as Stripe.Charge).amount_refunded / 100
                : null,
            p_disputed: event.type.startsWith("charge.dispute.")
              ? (object as Stripe.Dispute).status !== "won"
              : null,
          });
          if (result.error) throw result.error;
        }
      }
      return NextResponse.json({ received: true });
    }
    const command = paymentCommand(event);
    if (!command) return NextResponse.json({ received: true });
    if (event.type === "invoice.paid" && !command.p_payment) {
      const invoice = event.data.object as Stripe.Invoice;
      const payments = await stripe.invoicePayments.list({
        invoice: invoice.id,
        limit: 10,
      });
      command.p_payment = objectId(
        payments.data.find((p) => p.status === "paid")?.payment.payment_intent,
      );
    }
    if (command.p_key && !command.p_payment)
      throw new Error("Payment reference unavailable");
    if (command.p_payment) {
      const payment = await stripe.paymentIntents.retrieve(command.p_payment, {
        expand: ["latest_charge"],
      });
      const charge = payment.latest_charge;
      if (charge && typeof charge !== "string") {
        command.p_refunded = charge.amount_refunded / 100;
        command.p_disputed = false;
        if (charge.disputed) {
          const disputes = await stripe.disputes.list({
            payment_intent: command.p_payment,
            limit: 100,
          });
          if (disputes.has_more || !disputes.data.length)
            throw new Error("Dispute outcome unavailable");
          command.p_disputed = disputes.data.some(
            (dispute) => !["won", "warning_closed"].includes(dispute.status),
          );
        }
      }
    }
    const result = await db.rpc("apply_partnership_payment", command);
    if (result.error) throw result.error;
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Recording failed; retry this event." },
      { status: 500 },
    );
  }
}
