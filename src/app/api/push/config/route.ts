import { NextResponse } from "next/server";
import { isPushConfigured, vapidPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Tells the subscribe button whether Daily Word push is switched on. */
export async function GET() {
  const enabled = isPushConfigured();
  return NextResponse.json(
    { enabled, publicKey: enabled ? vapidPublicKey() : null },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
