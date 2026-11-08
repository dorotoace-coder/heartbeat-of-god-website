/**
 * Server-side reads for the Daily Word library. Every function is guarded:
 * with no Supabase credentials, a missing table or a failed query it returns
 * an empty result so pages fall back gracefully (never invented content).
 */
import { supabase, isSupabaseConfigured } from "./supabase";
import { todayISO, type DailyWord, type DailyWordSummary } from "./dailyWord";

const SUMMARY_COLS = "id,slug,publish_date,title,scripture_ref,scripture_text,devotional,image_url";
export const ARCHIVE_PAGE_SIZE = 12;

/** Strip characters that would break a PostgREST `or=` filter. */
function cleanQuery(q: string): string {
  return q.replace(/[,()*%\\"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function getDailyWordArchive({
  query = "",
  page = 1,
}: {
  query?: string;
  page?: number;
}): Promise<{ items: DailyWordSummary[]; total: number; error: boolean }> {
  if (!isSupabaseConfigured) return { items: [], total: 0, error: false };
  try {
    const from = (Math.max(1, page) - 1) * ARCHIVE_PAGE_SIZE;
    let q = supabase
      .from("daily_words")
      .select(SUMMARY_COLS, { count: "exact" })
      .eq("published", true)
      .lte("publish_date", todayISO())
      .order("publish_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + ARCHIVE_PAGE_SIZE - 1);
    const term = cleanQuery(query);
    if (term) {
      const like = `"%${term}%"`;
      q = q.or(
        `title.ilike.${like},scripture_ref.ilike.${like},scripture_text.ilike.${like},devotional.ilike.${like}`,
      );
    }
    const { data, error, count } = await q;
    if (error) throw error;
    return { items: (data as DailyWordSummary[]) ?? [], total: count ?? 0, error: false };
  } catch (err) {
    console.error("getDailyWordArchive failed:", err);
    return { items: [], total: 0, error: true };
  }
}

export async function getDailyWordBySlug(slug: string): Promise<DailyWord | null> {
  if (!isSupabaseConfigured || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  try {
    const { data, error } = await supabase
      .from("daily_words")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .lte("publish_date", todayISO())
      .maybeSingle();
    if (error) throw error;
    return (data as DailyWord) ?? null;
  } catch (err) {
    console.error("getDailyWordBySlug failed:", err);
    return null;
  }
}

type Neighbour = Pick<DailyWord, "slug" | "title" | "publish_date">;

/** Older (prev) and newer (next) published posts around a date. */
export async function getDailyWordNeighbours(
  word: Pick<DailyWord, "publish_date" | "slug">,
): Promise<{ prev: Neighbour | null; next: Neighbour | null }> {
  if (!isSupabaseConfigured) return { prev: null, next: null };
  try {
    const today = todayISO();
    const [older, newer] = await Promise.all([
      supabase
        .from("daily_words")
        .select("slug,title,publish_date")
        .eq("published", true)
        .lt("publish_date", word.publish_date)
        .order("publish_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("daily_words")
        .select("slug,title,publish_date")
        .eq("published", true)
        .gt("publish_date", word.publish_date)
        .lte("publish_date", today)
        .order("publish_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    return { prev: (older.data as Neighbour) ?? null, next: (newer.data as Neighbour) ?? null };
  } catch {
    return { prev: null, next: null };
  }
}

/** Today's published Daily Word, or null (home falls back to the local verse). */
export async function getTodaysDailyWord(): Promise<DailyWordSummary | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("daily_words")
      .select(SUMMARY_COLS)
      .eq("published", true)
      .eq("publish_date", todayISO())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as DailyWordSummary) ?? null;
  } catch {
    return null;
  }
}

/** Published slugs for the sitemap / static params. */
export async function getPublishedDailyWordSlugs(): Promise<{ slug: string; publish_date: string; created_at: string }[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("daily_words")
      .select("slug,publish_date,created_at")
      .eq("published", true)
      .lte("publish_date", todayISO())
      .order("publish_date", { ascending: false })
      .limit(5000);
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}
