/**
 * Is HBG TV (@HBG_tv) live on YouTube right now?
 *
 * Primary check (no key): fetch the channel's public /live page. While a
 * stream is on air YouTube serves that video's watch page there — its
 * canonical link is /watch?v=<id> and the player data carries
 * "isLiveNow":true. Otherwise the page is the channel itself.
 *
 * Optional YOUTUBE_API_KEY: confirms the candidate with videos.list (1 quota
 * unit) and, if the page check is blocked, falls back to search.list
 * (eventType=live, 100 units) cached for 20 minutes to stay inside the free
 * 10,000-unit daily quota.
 *
 * Every failure returns { live: false } — the site simply shows no banner.
 */
import { YOUTUBE_CHANNEL_ID } from "./site";

export type LiveStatus = { live: boolean; videoId: string | null; title: string | null };

const NOT_LIVE: LiveStatus = { live: false, videoId: null, title: null };
export const LIVE_REVALIDATE_SECONDS = 120;
const VIDEO_ID = /^[\w-]{11}$/;

function apiKey(): string | null {
  return process.env.YOUTUBE_API_KEY?.trim() || null;
}

/**
 * Parse the /live page HTML. Exported for testing.
 * Returns null when the page is not something we recognise (don't trust it).
 */
export function parseLivePage(html: string): LiveStatus | null {
  const fromCanonical = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/)?.[1];
  const fromEndpoint = html.match(/"currentVideoEndpoint":\{[\s\S]{0,600}?"watchEndpoint":\{"videoId":"([\w-]{11})"/)?.[1];
  const videoId = fromCanonical || fromEndpoint;
  if (!videoId) return NOT_LIVE; // the channel page — nothing on air

  // Live signals: the player's "isLiveNow" flag, or the watch page's own
  // view counter reading "watching now" (isLive) when the player is withheld.
  const liveNow =
    html.includes('"isLiveNow":true') ||
    /"videoPrimaryInfoRenderer":\{[\s\S]{0,4000}?"videoViewCountRenderer":\{[\s\S]{0,600}?"isLive":true/.test(html);
  if (!liveNow) return NOT_LIVE; // an upcoming/scheduled stream or a replay, not live yet

  if (!html.includes(`"channelId":"${YOUTUBE_CHANNEL_ID}"`)) return null; // someone else's page
  const t =
    html.match(/<meta name="title" content="([^"]+)"/)?.[1] ??
    html.match(/"videoPrimaryInfoRenderer":\{"title":\{"runs":\[\{"text":"([^"]+)"/)?.[1] ??
    null;
  return { live: true, videoId, title: t ? decodeEntities(t) : null };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function checkLivePage(): Promise<LiveStatus | null> {
  try {
    const res = await fetch(`https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}/live`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=YES+1; SOCS=CAI",
      },
      next: { revalidate: LIVE_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return parseLivePage(await res.text());
  } catch {
    return null;
  }
}

async function confirmWithApi(videoId: string, key: string): Promise<boolean | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${encodeURIComponent(key)}`,
      { next: { revalidate: LIVE_REVALIDATE_SECONDS }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: { snippet?: { liveBroadcastContent?: string; channelId?: string } }[] };
    const s = data.items?.[0]?.snippet;
    return Boolean(s && s.liveBroadcastContent === "live" && s.channelId === YOUTUBE_CHANNEL_ID);
  } catch {
    return null;
  }
}

async function searchWithApi(key: string): Promise<LiveStatus | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&eventType=live&type=video&maxResults=1&key=${encodeURIComponent(key)}`,
      { next: { revalidate: 1200 }, signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: { id?: { videoId?: string }; snippet?: { title?: string } }[] };
    const item = data.items?.[0];
    const videoId = item?.id?.videoId;
    if (!videoId || !VIDEO_ID.test(videoId)) return NOT_LIVE;
    return { live: true, videoId, title: item?.snippet?.title ?? null };
  } catch {
    return null;
  }
}

export async function getLiveStatus(): Promise<LiveStatus> {
  const key = apiKey();
  const page = await checkLivePage();

  if (page) {
    if (page.live && page.videoId && key) {
      const confirmed = await confirmWithApi(page.videoId, key);
      if (confirmed === false) return NOT_LIVE;
    }
    return page;
  }

  // Page check failed (blocked / changed). Only the API can tell us now.
  if (key) return (await searchWithApi(key)) ?? NOT_LIVE;
  return NOT_LIVE;
}
