/**
 * Daily Word — shared types and helpers (safe on server and client).
 * Table: daily_words (see src/lib/schema.sql).
 */
import { DAILY_WORD_TIMEZONE } from "./site";

export type DailyWord = {
  id: string;
  slug: string;
  publish_date: string; // YYYY-MM-DD
  title: string;
  scripture_ref: string;
  scripture_text: string;
  devotional: string;
  image_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  youtube_url: string | null;
  published: boolean;
  created_at: string;
};

export type DailyWordSummary = Pick<
  DailyWord,
  "id" | "slug" | "publish_date" | "title" | "scripture_ref" | "scripture_text" | "devotional" | "image_url"
>;

/** "the-lord-is-my-shepherd" from any title. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Slug from date + title, e.g. "2026-11-08-be-still". */
export function dailyWordSlug(publishDate: string, title: string): string {
  const t = slugify(title);
  return t ? `${publishDate}-${t}` : publishDate;
}

/** Today's date (YYYY-MM-DD) in the ministry's timezone. */
export function todayISO(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAILY_WORD_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "Sunday, November 8, 2026" for a YYYY-MM-DD string. */
export function formatPublishDate(iso: string, style: "long" | "short" = "long"): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    ...(style === "long"
      ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" }),
  });
}

/** Plain-text excerpt of the devotional (markdown stripped). */
export function excerpt(markdown: string, max = 180): string {
  const plain = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

export function safeHttpsUrl(u?: string | null): string | null {
  return u && /^https:\/\/[^\s]+$/.test(u.trim()) ? u.trim() : null;
}
