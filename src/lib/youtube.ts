/**
 * "Latest from HBG TV" — reads the channel's public YouTube RSS feed on the
 * server (cached for an hour). No API key, no dependencies: the Atom feed is
 * small and regular, so a tiny regex parser is enough. Any failure returns []
 * and the section simply hides itself.
 */
import { YOUTUBE_CHANNEL_ID, YOUTUBE_FEED_URL, YOUTUBE_PLAYLISTS_URL, KNOWN_SERIES_PLAYLIST_IDS } from "./site";

export type YouTubeVideo = {
  id: string;
  title: string;
  published: string; // ISO
  url: string;
  thumbnail: string;
  /** Channel that uploaded the video (playlists can include other channels' videos). */
  channelId?: string;
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
      channelId: tag(e, "yt:channelId") ?? undefined,
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

/* ─── Sermon series (public YouTube playlists) ─────────────────────────── */

export type SermonSeries = {
  id: string;
  title: string;
  url: string;
  videos: YouTubeVideo[];
};

const PLAYLIST_ID_RE = /"playlistId":"(PL[\w-]{10,64})"/g;

/**
 * Public playlist IDs on the HBG TV channel. Reads the channel's public
 * /playlists page (no API key). Falls back to the IDs known in site.ts if the
 * page can't be read, so a YouTube markup change never empties the section.
 */
async function getChannelPlaylistIds(): Promise<string[]> {
  const ids = new Set<string>(KNOWN_SERIES_PLAYLIST_IDS);
  try {
    const res = await fetch(YOUTUBE_PLAYLISTS_URL, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
      headers: { "Accept-Language": "en" },
    });
    if (res.ok) {
      const html = await res.text();
      for (const m of html.matchAll(PLAYLIST_ID_RE)) ids.add(m[1]);
    }
  } catch (err) {
    console.error("getChannelPlaylistIds failed:", err instanceof Error ? err.message : err);
  }
  return [...ids];
}

async function getPlaylist(id: string): Promise<SermonSeries | null> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${id}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`playlist ${id} HTTP ${res.status}`);
    const xml = await res.text();
    const head = xml.split("<entry>")[0];
    const title = tag(head, "title") ?? "HBG TV";
    // Only the ministry's own uploads — playlists can also hold other channels' videos.
    const videos = parseYouTubeFeed(xml).filter((v) => !v.channelId || v.channelId === YOUTUBE_CHANNEL_ID);
    if (videos.length === 0) return null;
    return { id, title, url: `https://www.youtube.com/playlist?list=${id}`, videos };
  } catch (err) {
    console.error("getPlaylist failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Every public playlist on HBG TV as a sermon series (cached for an hour). */
export async function getSermonSeries(): Promise<SermonSeries[]> {
  const ids = await getChannelPlaylistIds();
  const series = await Promise.all(ids.map(getPlaylist));
  return series.filter((s): s is SermonSeries => s !== null);
}
