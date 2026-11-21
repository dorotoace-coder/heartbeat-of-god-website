import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };
const supported = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const aiKey = process.env.OPENAI_API_KEY;
  if (!token || !url || !anonKey) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: noStore });
  if (!aiKey) return NextResponse.json({ error: "AI captioning is not configured. Write a caption manually." }, { status: 503, headers: noStore });

  let path: unknown;
  try { ({ path } = await request.json()); }
  catch { return NextResponse.json({ error: "Invalid request" }, { status: 400, headers: noStore }); }
  if (typeof path !== "string" || !/^[0-9a-f-]{36}_[^/\\]{1,160}$/i.test(path)) {
    return NextResponse.json({ error: "Choose an image in the vault" }, { status: 400, headers: noStore });
  }

  const client = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const [identity, permission] = await Promise.all([
    client.auth.getUser(token), client.rpc("can_use_media_vault"),
  ]);
  if (identity.error || !identity.data.user || permission.error || permission.data !== true) {
    return NextResponse.json({ error: "Media access required" }, { status: 403, headers: noStore });
  }

  const asset = await client.storage.from("staff-media-vault").download(path);
  if (asset.error || !asset.data) return NextResponse.json({ error: "Image unavailable" }, { status: 404, headers: noStore });
  const blob = asset.data;
  if (!supported.has(blob.type) || blob.size > 5_000_000) {
    return NextResponse.json({ error: "AI drafting accepts JPEG, PNG or WebP images up to 5 MB." }, { status: 400, headers: noStore });
  }
  const reservation = await client.rpc("reserve_media_caption_request");
  if (reservation.error || reservation.data !== true) {
    return NextResponse.json({ error: "Caption draft limit reached for today. Write a caption manually." }, { status: 429, headers: noStore });
  }

  try {
    const image = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.HBG_MEDIA_CAPTION_MODEL || "gpt-5.4-mini",
        store: false,
        max_output_tokens: 220,
        instructions: "Draft one concise caption for Heartbeat of God Ministry. Describe only what is visible. Do not invent names, dates, locations, Scripture references, spiritual outcomes, quotations or consent. No hashtags. This is an unpublished draft for human review.",
        input: [{ role: "user", content: [
          { type: "input_text", text: "Write a warm, clear caption for this ministry image. If people appear, describe the scene without identifying them." },
          { type: "input_image", image_url: image, detail: "low" },
        ] }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) return NextResponse.json({ error: "Caption draft is temporarily unavailable" }, { status: 502, headers: noStore });
    const data = await response.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const caption = data.output?.flatMap(item => item.content ?? [])
      .filter(item => item.type === "output_text").map(item => item.text ?? "").join(" ").trim().slice(0, 1200);
    if (!caption) return NextResponse.json({ error: "No caption was returned" }, { status: 502, headers: noStore });
    return NextResponse.json({ caption }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Caption draft is temporarily unavailable" }, { status: 502, headers: noStore });
  }
}
