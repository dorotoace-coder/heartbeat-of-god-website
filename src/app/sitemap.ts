import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getPublishedDailyWordSlugs } from "@/lib/dailyWordData";

// Rebuilt hourly so newly published Daily Words appear without a redeploy.
export const revalidate = 3600;

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/daily-word", priority: 0.9, changeFrequency: "daily" },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" },
  { path: "/programs", priority: 0.9, changeFrequency: "weekly" },
  { path: "/media", priority: 0.9, changeFrequency: "weekly" },
  { path: "/watch", priority: 0.9, changeFrequency: "weekly" },
  { path: "/departments", priority: 0.8, changeFrequency: "monthly" },
  { path: "/give", priority: 0.8, changeFrequency: "monthly" },
  { path: "/connect", priority: 0.8, changeFrequency: "monthly" },
  { path: "/feed-the-future", priority: 0.8, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const words = await getPublishedDailyWordSlugs();
  return [
    ...STATIC_ROUTES.map((r) => ({
      url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
      lastModified: now,
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...words.map((w) => ({
      url: `${SITE_URL}/daily-word/${w.slug}`,
      lastModified: w.publish_date,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
