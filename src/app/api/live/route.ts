import { NextResponse } from "next/server";
import { getLiveStatus } from "@/lib/live";

// Re-checked at most every two minutes (see LIVE_REVALIDATE_SECONDS).
export const revalidate = 120;

export async function GET() {
  const status = await getLiveStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
  });
}
