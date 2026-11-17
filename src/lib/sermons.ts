/**
 * Sermon helpers shared by the server (message pages, sitemap) and the
 * client (home strip, media library). Keep this file free of "use client"
 * so server components can call these functions.
 */
import { supabase, isSupabaseConfigured } from "./supabase";
import { SITE_URL } from "./site";

export interface Vlog {
  id: string;
  title: string;
  preacher: string;
  description?: string | null;
  category?: string | null;
  date_preached?: string | null;
  duration?: string | null;
  thumbnail_url?: string | null;
  youtube_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
}

/** The playable video URL, whichever column the DB uses. */
export function videoUrlOf(v?: Vlog | null): string | null {
  return v?.youtube_url || v?.video_url || null;
}

/** Extract a YouTube video id from common URL shapes. */
export function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}

/** Thumbnail: the DB image, else YouTube's own thumbnail, else null (gradient). */
export function thumbFor(v: Vlog): string | null {
  if (v.thumbnail_url?.startsWith("https://") || v.thumbnail_url?.startsWith("/")) return v.thumbnail_url;
  const id = youtubeId(videoUrlOf(v));
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

export function safeHttps(u?: string | null): string | null {
  return u && /^https:\/\//.test(u) ? u : null;
}

/**
 * Files hosted on this site are linked by path, so the browser treats them as
 * same-origin and the `download` attribute saves them instead of opening them.
 */
export function sameOriginPath(u: string): string {
  return u.startsWith(SITE_URL + "/") ? u.slice(SITE_URL.length) : u;
}

export function isOwnFile(u?: string | null): boolean {
  return Boolean(u && (u.startsWith(SITE_URL + "/") || u.startsWith("/")));
}

function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** Readable, stable link for one message: /media/<title>-<id>. */
export function sermonPath(v: Pick<Vlog, "id" | "title">): string {
  const s = slugify(v.title);
  return `/media/${s ? `${s}-` : ""}${v.id}`;
}

export function sermonUrl(v: Pick<Vlog, "id" | "title">): string {
  return `${SITE_URL}${sermonPath(v)}`;
}

const UUID_AT_END = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** The sermon id at the end of a /media/<slug> segment, or null. */
export function sermonIdFrom(param: string): string | null {
  const m = param.match(UUID_AT_END);
  return m ? m[1].toLowerCase() : null;
}

export function formatPreached(date?: string | null, month: "long" | "short" = "long"): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month, day: "numeric", year: "numeric", timeZone: "UTC" });
}

/* ---------- server reads (each fails soft, like dailyWordData) ---------- */

export async function getSermon(id: string): Promise<Vlog | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from("sermons").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data as Vlog) ?? null;
  } catch (err) {
    console.error("getSermon failed:", err);
    return null;
  }
}

/** Newest messages other than `exceptId`, for "More messages". */
export async function getRecentSermons(exceptId: string, limit = 3): Promise<Vlog[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("sermons")
      .select("*")
      .neq("id", exceptId)
      .order("date_preached", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as Vlog[]) ?? [];
  } catch {
    return [];
  }
}

export async function getSermonLinks(): Promise<{ id: string; title: string; date_preached: string | null }[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("sermons")
      .select("id,title,date_preached")
      .order("date_preached", { ascending: false })
      .limit(2000);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}
