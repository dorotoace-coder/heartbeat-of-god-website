/**
 * Daily Word web push. Inert until all of these are set:
 *
 *   VAPID_PUBLIC_KEY            public VAPID key (served to browsers by /api/push/config)
 *   VAPID_PRIVATE_KEY           server-only VAPID private key
 *   SUPABASE_SERVICE_ROLE_KEY   server-only; reads/writes push_subscriptions
 *   (optional) VAPID_SUBJECT    "mailto:" or https URL; defaults to the ministry inbox
 *
 * Table: push_subscriptions — supabase/migrations-pending/push.sql (not yet run).
 */
import { MINISTRY_EMAIL } from "./site";
import { getSupabaseAdmin } from "./supabaseAdmin";

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

export function isPushConfigured(): boolean {
  return Boolean(vapidPublicKey() && process.env.VAPID_PRIVATE_KEY?.trim() && getSupabaseAdmin());
}

export function vapidSubject(): string {
  const s = process.env.VAPID_SUBJECT?.trim();
  return s && /^(mailto:|https:\/\/)/.test(s) ? s : `mailto:${MINISTRY_EMAIL}`;
}

export type StoredSubscription = { endpoint: string; p256dh: string; auth: string };

/** Validates a PushSubscription JSON from the browser. */
export function parseSubscription(input: unknown): StoredSubscription | null {
  if (!input || typeof input !== "object") return null;
  const o = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const endpoint = typeof o.endpoint === "string" ? o.endpoint : "";
  const p256dh = typeof o.keys?.p256dh === "string" ? o.keys.p256dh : "";
  const auth = typeof o.keys?.auth === "string" ? o.keys.auth : "";
  if (!/^https:\/\/[^\s]{10,1000}$/.test(endpoint) || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) return null;
  return { endpoint, p256dh, auth };
}
