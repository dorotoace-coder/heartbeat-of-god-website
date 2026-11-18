import { NextRequest, NextResponse } from "next/server";
import { getDailyWordBySlug } from "@/lib/dailyWordData";

/**
 * Download only approved public devotional images from this site's Supabase
 * Storage project. Do not proxy arbitrary admin-supplied image URLs.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) {
    return NextResponse.json({ error: "Invalid devotional" }, { status: 400 });
  }

  const word = await getDailyWordBySlug(slug);
  if (!word?.image_url) {
    return NextResponse.json({ error: "Devotional image unavailable" }, { status: 404 });
  }

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl) return NextResponse.json({ error: "Storage unavailable" }, { status: 503 });

  let url: URL;
  try {
    url = new URL(word.image_url);
    const project = new URL(projectUrl);
    if (
      url.protocol !== "https:" ||
      url.origin !== project.origin ||
      !url.pathname.startsWith("/storage/v1/object/public/clt-devotionals/") ||
      url.username ||
      url.password
    ) {
      return NextResponse.json({ error: "Image not in approved CLT storage" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  try {
    const response = await fetch(url.toString(), { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Image storage unavailable");
    const mime = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      return NextResponse.json({ error: "Unsupported image format" }, { status: 415 });
    }
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > 15_000_000) return NextResponse.json({ error: "Image too large" }, { status: 413 });
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 15_000_000) return NextResponse.json({ error: "Image too large" }, { status: 413 });
    const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="hbg-clt-${word.publish_date}.${extension}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image download failed" }, { status: 502 });
  }
}
