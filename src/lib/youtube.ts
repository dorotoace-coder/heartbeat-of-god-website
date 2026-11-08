/**
 * "Latest from HBG TV" — reads the channel's public YouTube RSS feed on the
 * server (cached for an hour). No API key, no dependencies: the Atom feed is
 * small and regular, so a tiny regex parser is enough. Any failure returns []
 * and the section simply hides itself.
 */
import { YOUTUBE_FEED_URL } from "./site";

export type YouTubeVideo = {
  id: string;
  title: string;
  published: string; // ISO
  url: string;
  thumbnail: string;
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .trim();
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : null;
}

export function parseYouTubeFeed(xml: string): YouTubeVideo[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  const out: YouTubeVideo[] = [];
  for (const e of entries) {
    const id = tag(e, "yt:videoId");
    if (!id || !/^[\w-]{11}$/.test(id)) continue;
    out.push({
      id,
      title: tag(e, "title") ?? "HBG TV",
      published: tag(e, "published") ?? "",
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
  }
  return out;
}

export async function getLatestVideos(limit = 6): Promise<YouTubeVideo[]> {
  try {
    const res = await fetch(YOUTUBE_FEED_URL, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`YouTube feed HTTP ${res.status}`);
    const xml = await res.text();
    return parseYouTubeFeed(xml).slice(0, limit);
  } catch (err) {
    console.error("getLatestVideos failed:", err instanceof Error ? err.message : err);
    return [];
  }
}
