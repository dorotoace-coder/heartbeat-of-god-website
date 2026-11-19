import { NextRequest, NextResponse } from "next/server";
import { isPushConfigured, parseSubscription } from "@/lib/push";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/** Save (POST) or remove (DELETE) a browser's Daily Word push subscription. */
export async function POST(req: NextRequest) {
  const db = getSupabaseAdmin();
  if (!isPushConfigured() || !db) return NextResponse.json({ error: "Notifications are not available." }, { status: 503 });

  const sub = parseSubscription(await req.json().catch(() => null));
  if (!sub) return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });

  const { error } = await db.from("push_subscriptions").upsert(
    { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("push subscribe failed:", error.message);
    return NextResponse.json({ error: "Could not save subscription." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const db = getSupabaseAdmin();
  if (!isPushConfigured() || !db) return NextResponse.json({ ok: true });
  const body = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  if (endpoint) await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
