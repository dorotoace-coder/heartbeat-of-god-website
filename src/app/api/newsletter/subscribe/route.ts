import { NextRequest, NextResponse } from "next/server";
import { EMAIL_RE, subscribe } from "@/lib/newsletter";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email : "";
  if (!EMAIL_RE.test(email.trim())) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  const result = await subscribe(email, "footer");
  if (!result.ok) return NextResponse.json({ error: "Could not save that just now." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
