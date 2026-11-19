import { NextRequest, NextResponse } from "next/server";
import { unsubscribe } from "@/lib/newsletter";

/** Link in every email: /api/newsletter/unsubscribe?token=… → /unsubscribed */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const ok = await unsubscribe(token);
  return NextResponse.redirect(new URL(ok ? "/unsubscribed" : "/unsubscribed?status=unknown", req.nextUrl.origin), 303);
}

/** RFC 8058 one-click unsubscribe (List-Unsubscribe-Post) from mail apps. */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const ok = await unsubscribe(token);
  return NextResponse.json({ ok });
}
