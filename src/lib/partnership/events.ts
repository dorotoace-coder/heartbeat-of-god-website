import type Stripe from "stripe";
/** Convert verified provider events into an accounting command. Browser redirects never call this. */
export function paymentCommand(event: Stripe.Event) {
  const object = event.data.object;
  let metadata: Stripe.Metadata | null = null;
  let customer: string | null = null;
  let subscription: string | null = null;
  let key: string | null = null;
  let amount: number | null = null;
  let currency: string | null = null;
  let status = "";
  let payment: string | null = null;
  const id = (value: unknown) =>
    typeof value === "string"
      ? value
      : value && typeof value === "object" && "id" in value
        ? String(value.id)
        : null;
  if (
    [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.expired",
    ].includes(event.type)
  ) {
    const s = object as Stripe.Checkout.Session;
    metadata = s.metadata;
    customer = id(s.customer);
    subscription = id(s.subscription);
    if (s.mode === "subscription" && event.type !== "checkout.session.expired")
      return null; // invoice.paid is the only recurring receipt, including the first payment.
    if (event.type === "checkout.session.expired") {
      if (!customer) return null;
      status = "expired";
    } else {
      if (s.payment_status !== "paid") return null;
      key = `checkout:${s.id}`;
      payment = id(s.payment_intent);
      amount = (s.amount_total ?? 0) / 100;
      currency = s.currency?.toUpperCase() ?? null;
      status = "paid";
    }
  } else if (event.type === "invoice.paid") {
    const invoice = object as Stripe.Invoice;
    metadata = invoice.parent?.subscription_details?.metadata ?? null;
    customer = id(invoice.customer);
    subscription = id(invoice.parent?.subscription_details?.subscription);
    if (invoice.status !== "paid" || invoice.amount_paid <= 0) return null;
    key = `invoice:${invoice.id}`;
    amount = invoice.amount_paid / 100;
    currency = invoice.currency.toUpperCase();
    status = "active";
    payment = id(
      invoice.payments?.data.find((p) => p.status === "paid")?.payment
        .payment_intent,
    );
  } else if (
    [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "customer.subscription.paused",
      "customer.subscription.resumed",
    ].includes(event.type)
  ) {
    const s = object as Stripe.Subscription;
    metadata = s.metadata;
    customer = id(s.customer);
    subscription = s.id;
    status = s.status;
  } else if (event.type === "invoice.payment_failed") {
    const invoice = object as Stripe.Invoice;
    metadata = invoice.parent?.subscription_details?.metadata ?? null;
    customer = id(invoice.customer);
    subscription = id(invoice.parent?.subscription_details?.subscription);
    status = "past_due";
  } else return null;
  if (
    metadata?.source !== "hbg-partnership" ||
    !metadata.commitment_id ||
    !customer
  )
    return null;
  return {
    p_event: event.id,
    p_event_at: event.created,
    p_commitment: metadata.commitment_id,
    p_customer: customer,
    p_subscription: subscription,
    p_status: status,
    p_key: key,
    p_amount: amount,
    p_currency: currency,
    p_payment: payment,
    p_refunded: 0,
    p_disputed: false,
  };
}
