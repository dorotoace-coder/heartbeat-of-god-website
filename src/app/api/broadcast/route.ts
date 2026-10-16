import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  allowedImageHosts,
  createFixedWindowRateLimiter,
  handleBroadcastRequest,
  type BroadcastPlatform,
} from "@/lib/broadcastSecurity.mjs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

// ── Platform poster functions ──────────────────────────────────────

async function postToTelegram(message: string, imageUrl?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { platform: "telegram", ok: false, error: "Missing credentials" };

  try {
    let url, body;
    if (imageUrl) {
      url = `https://api.telegram.org/bot${token}/sendPhoto`;
      body = { chat_id: chatId, photo: imageUrl, caption: message, parse_mode: "HTML" };
    } else {
      url = `https://api.telegram.org/bot${token}/sendMessage`;
      body = { chat_id: chatId, text: message, parse_mode: "HTML" };
    }
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    return { platform: "telegram", ok: data.ok, data };
  } catch (error: unknown) {
    return { platform: "telegram", ok: false, error: getErrorMessage(error) };
  }
}

async function postToFacebook(message: string, imageUrl?: string) {
  const token = process.env.FACEBOOK_PAGE_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  if (!token || !pageId) return { platform: "facebook", ok: false, error: "Missing credentials" };

  try {
    let url, body;
    if (imageUrl) {
      url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      body = { url: imageUrl, caption: message, access_token: token };
    } else {
      url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
      body = { message, access_token: token };
    }
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    return { platform: "facebook", ok: !data.error, data };
  } catch (error: unknown) {
    return { platform: "facebook", ok: false, error: getErrorMessage(error) };
  }
}

async function postToInstagram(message: string, imageUrl?: string) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igId = process.env.INSTAGRAM_BUSINESS_ID;
  if (!token || !igId) return { platform: "instagram", ok: false, error: "Missing credentials" };
  if (!imageUrl) return { platform: "instagram", ok: false, error: "Instagram requires an image" };

  try {
    // Step 1: Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${igId}/media`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl, caption: message, access_token: token }) }
    );
    const container = await containerRes.json();
    if (!container.id) return { platform: "instagram", ok: false, error: container.error?.message };

    // Step 2: Publish
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igId}/media_publish`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: container.id, access_token: token }) }
    );
    const published = await publishRes.json();
    return { platform: "instagram", ok: !!published.id, data: published };
  } catch (error: unknown) {
    return { platform: "instagram", ok: false, error: getErrorMessage(error) };
  }
}

async function postToTwitter(message: string) {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return { platform: "twitter", ok: false, error: "Missing credentials" };
  }

  try {
    // OAuth 1.0a signature
    const oauth = await buildOAuth1Header("POST", "https://api.twitter.com/2/tweets", {}, apiKey, apiSecret, accessToken, accessSecret);
    const body = { text: message.slice(0, 280) };
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: { "Authorization": oauth, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { platform: "twitter", ok: !!data.data?.id, data };
  } catch (error: unknown) {
    return { platform: "twitter", ok: false, error: getErrorMessage(error) };
  }
}

async function sendWhatsAppBroadcast(message: string, imageUrl?: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipients = (process.env.WHATSAPP_BROADCAST_NUMBERS || "").split(",").filter(Boolean);
  if (!token || !phoneId || !recipients.length) {
    return { platform: "whatsapp", ok: false, error: "Missing credentials or recipient list" };
  }

  const results = await Promise.all(recipients.map(async (to) => {
    const body = imageUrl
      ? { messaging_product: "whatsapp", to: to.trim(), type: "image",
          image: { link: imageUrl, caption: message } }
      : { messaging_product: "whatsapp", to: to.trim(), type: "text",
          text: { body: message } };

    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return res.json();
  }));
  return { platform: "whatsapp", ok: true, sent: recipients.length, results };
}

// ── Minimal OAuth 1.0a helper ──
async function buildOAuth1Header(method: string, url: string, params: Record<string, string>,
  consumerKey: string, consumerSecret: string, token: string, tokenSecret: string) {
  const nonce = Math.random().toString(36).substring(2);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey, oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1", oauth_timestamp: timestamp,
    oauth_token: token, oauth_version: "1.0"
  };
  const allParams = { ...params, ...oauthParams };
  const sortedParams = Object.keys(allParams).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allParams[k])}`).join("&");
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(signingKey),
    { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(baseString));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));
  oauthParams.oauth_signature = signature;

  const header = "OAuth " + Object.keys(oauthParams)
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
    .join(", ");
  return header;
}

// ── Main route ──────────────────────────────────────────────────────

const STAFF_ROLES = new Set(["owner", "pastor", "manager"]);
const broadcastLimiter = createFixedWindowRateLimiter({ limit: 3, windowMs: 10 * 60 * 1000 });

async function authorizeStaff(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false as const, status: 503, errorCode: "AUTHORIZATION_UNAVAILABLE" };
  }

  const authClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return { ok: false as const, status: 401, errorCode: "UNAUTHORIZED" };
  }

  const { data: profile, error: profileError } = await authClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false as const, status: 503, errorCode: "AUTHORIZATION_UNAVAILABLE" };
  }
  if (!profile?.role || !STAFF_ROLES.has(profile.role)) {
    return { ok: false as const, status: 403, errorCode: "FORBIDDEN" };
  }

  return { ok: true as const, userId: user.id };
}

const senders: Record<BroadcastPlatform, (message: string, imageUrl?: string) => Promise<{ ok?: boolean }>> = {
  telegram: postToTelegram,
  facebook: postToFacebook,
  instagram: postToInstagram,
  twitter: postToTwitter,
  whatsapp: sendWhatsAppBroadcast,
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const result = await handleBroadcastRequest({
    enabled: process.env.BROADCASTS_ENABLED === "true",
    authorizationHeader: req.headers.get("authorization"),
    body,
    authorize: authorizeStaff,
    env: process.env,
    limiter: broadcastLimiter,
    senders,
    imageHosts: allowedImageHosts(process.env.BROADCAST_IMAGE_HOSTS),
  });

  if (!result.ok) {
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (result.retryAfterSeconds) headers["Retry-After"] = String(result.retryAfterSeconds);
    return NextResponse.json(
      {
        error: result.errorCode,
        ...(result.unavailablePlatforms ? { unavailablePlatforms: result.unavailablePlatforms } : {}),
      },
      { status: result.status, headers },
    );
  }

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
