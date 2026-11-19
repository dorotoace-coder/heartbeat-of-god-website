/**
 * Server-only Supabase client using the service-role key. Used by the push,
 * newsletter and cron routes to read/write tables that have no public
 * policies. Returns null until both env vars are set, so every caller stays
 * inert (no errors) on a deployment without the key.
 *
 *   NEXT_PUBLIC_SUPABASE_URL      already set for the site
 *   SUPABASE_SERVICE_ROLE_KEY     server-only; never prefix with NEXT_PUBLIC_
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return client;
}
