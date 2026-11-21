/**
 * Sermon podcast — RSS 2.0 + iTunes namespace, served at /podcast.xml.
 * Built from the media library (`sermons` rows that have an https audio_url).
 * Submit https://heartbeatofgod.ca/podcast.xml to Apple Podcasts / Spotify.
 * With no Supabase or no audio yet it is a valid, empty feed.
 */
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { DESCRIPTION, FOUNDER, MINISTRY_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import { sermonUrl, thumbFor, type Vlog } from "@/lib/sermons";

export const revalidate = 3600;

const COVER = `${SITE_URL}/podcast-cover.jpg`; // existing HBG logo on the site's ink background, 1400×1400

function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // strip characters that are illegal in XML 1.0
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function mimeOf(url: string, header?: string | null): string {
  if (header && /^audio\//.test(header)) return header.split(";")[0];
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "m4a" || ext === "aac") return "audio/x-m4a";
  if (ext === "wav") return "audio/wav";
  if (ext === "ogg" || ext === "oga") return "audio/ogg";
  return "audio/mpeg";
}

/** Byte size + type for <enclosure>, via HEAD. 0 if the host won't say. */
async function probe(url: string): Promise<{ length: number; type: string }> {
  try {
    const res = await fetch(url, { method: "HEAD", next: { revalidate: 86400 }, signal: AbortSignal.timeout(4000) });
    const len = Number(res.headers.get("content-length"));
    return { length: Number.isFinite(len) && len > 0 ? len : 0, type: mimeOf(url, res.headers.get("content-type")) };
  } catch {
    return { length: 0, type: mimeOf(url) };
  }
}

/** "1:02:03", "45:10" or "45 min" → itunes:duration ("HH:MM:SS"/"MM:SS"/seconds). */
function durationOf(d?: string | null): string | null {
  if (!d) return null;
  const t = d.trim();
  if (/^\d{1,2}(:\d{2}){1,2}$/.test(t)) return t;
  const m = t.match(/^(\d+)\s*(m|min|mins|minutes)$/i);
  return m ? String(Number(m[1]) * 60) : null;
}

async function getAudioSermons(): Promise<Vlog[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("sermons")
      .select("*")
      .not("audio_url", "is", null)
      .like("audio_url", "https://%")
      .order("date_preached", { ascending: false })
      .limit(300);
    if (error) throw error;
    return (data as (Vlog & { created_at?: string })[]) ?? [];
  } catch (err) {
    console.error("podcast feed: sermons read failed:", err);
    return [];
  }
}

export async function GET() {
  const sermons = await getAudioSermons();
  const probes = await Promise.all(sermons.map((s) => probe(s.audio_url!)));

  const items = sermons
    .map((s, i) => {
      const link = sermonUrl(s);
      const date = s.date_preached ? new Date(`${s.date_preached}T12:00:00Z`) : null;
      const pub = date && !Number.isNaN(date.getTime()) ? date.toUTCString() : null;
      const dur = durationOf(s.duration);
      const thumb = thumbFor(s);
      const image = thumb ? (thumb.startsWith("/") ? `${SITE_URL}${thumb}` : thumb) : null;
      const desc = s.description?.trim() || `${s.title} — ${s.preacher || FOUNDER}, ${SITE_NAME}.`;
      return `    <item>
      <title>${xml(s.title)}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="false">${xml(s.id)}</guid>
      <description>${xml(desc)}</description>
${pub ? `      <pubDate>${pub}</pubDate>\n` : ""}      <enclosure url="${xml(s.audio_url!)}" length="${probes[i].length}" type="${probes[i].type}"/>
      <itunes:author>${xml(s.preacher || FOUNDER)}</itunes:author>
      <itunes:summary>${xml(desc)}</itunes:summary>
      <itunes:explicit>false</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
${dur ? `      <itunes:duration>${dur}</itunes:duration>\n` : ""}${image && /^https:\/\/.+\.(jpe?g|png)(\?|$)/i.test(image) ? `      <itunes:image href="${xml(image)}"/>\n` : ""}    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xml(`${SITE_NAME} — Sermons`)}</title>
    <link>${SITE_URL}/media</link>
    <atom:link href="${SITE_URL}/podcast.xml" rel="self" type="application/rss+xml"/>
    <description>${xml(DESCRIPTION)}</description>
    <language>en</language>
    <copyright>${xml(`© ${new Date().getFullYear()} ${SITE_NAME}`)}</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${COVER}</url>
      <title>${xml(`${SITE_NAME} — Sermons`)}</title>
      <link>${SITE_URL}/media</link>
    </image>
    <itunes:author>${xml(FOUNDER)}</itunes:author>
    <itunes:summary>${xml(DESCRIPTION)}</itunes:summary>
    <itunes:owner>
      <itunes:name>${xml(FOUNDER)}</itunes:name>
      <itunes:email>${xml(MINISTRY_EMAIL)}</itunes:email>
    </itunes:owner>
    <itunes:image href="${COVER}"/>
    <itunes:category text="Religion &amp; Spirituality">
      <itunes:category text="Christianity"/>
    </itunes:category>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
