import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
export function partnershipEnabled() {
  return process.env.PARTNERSHIP_ENABLED === "true";
}
export function partnershipPaymentsConfigured() {
  return (
    process.env.PARTNERSHIP_STRIPE_ENABLED === "true" &&
    Boolean(
      process.env.STRIPE_SECRET_KEY &&
      process.env.PARTNERSHIP_STRIPE_WEBHOOK_SECRET &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
  );
}
export function automaticGivingEnabled() {
  return partnershipEnabled() && partnershipPaymentsConfigured();
}
export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function stripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}
export function siteOrigin() {
  const url = new URL(
    process.env.PARTNERSHIP_SITE_ORIGIN || "https://heartbeatofgod.ca",
  );
  if (
    url.protocol !== "https:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1"
  )
    throw new Error("Invalid site origin");
  return url.origin;
}
export async function authenticatedCommitment(req: Request) {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new Error("Sign in to continue.");
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user) throw new Error("Sign in to continue.");
  const body = await req.json();
  if (
    typeof body.commitmentId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(body.commitmentId)
  )
    throw new Error("Choose your commitment.");
  const result = await client
    .from("partnership_commitments")
    .select("*")
    .eq("id", body.commitmentId)
    .eq("user_id", user.id)
    .single();
  if (result.error || !result.data || result.data.method !== "stripe")
    throw new Error("Commitment unavailable.");
  return { commitment: result.data, user };
}
