import { supabase } from "@/lib/supabase";
import { isZoomInvitation } from "@/lib/liveMeeting";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  // Recheck on every click so disabling a meeting takes effect on already-open pages.
  const { data, error } = await supabase.rpc("public_live_join");
  const headers = { "Cache-Control": "no-store, max-age=0", "Referrer-Policy": "no-referrer" };
  if (error || !isZoomInvitation(data)) return new Response(null, { status: 303, headers: { ...headers, Location: new URL("/live", request.url).toString() } });
  return new Response(null, { status: 303, headers: { ...headers, Location: data } });
}
