import { Youtube } from "lucide-react";
import { getLatestVideos } from "@/lib/youtube";
import { SOCIALS } from "@/lib/site";
import { Section, SectionHeader } from "@/components/ui/Section";
import { buttonClass } from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import LiteYouTube from "./LiteYouTube";

function when(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * "Latest from HBG TV" — the 6 newest uploads from the channel's RSS feed.
 * Renders nothing if the feed is unavailable.
 */
export default async function LatestVideos({
  tone = "parchment",
  limit = 6,
}: {
  tone?: "ivory" | "parchment" | "white";
  limit?: number;
}) {
  const videos = await getLatestVideos(limit);
  if (videos.length === 0) return null;

  return (
    <Section tone={tone} aria-labelledby="latest-videos-title">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionHeader
          id="latest-videos-title"
          eyebrow="Fresh Uploads"
          title={<>Latest from <em className="text-gold-deep">HBG TV</em></>}
          className="mb-0 md:mb-0"
        />
        <a href={SOCIALS.youtube} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost-dark", "md", "mb-12 self-start md:mb-16 md:self-auto")}>
          <Youtube size={16} aria-hidden /> Subscribe to @HBG_tv<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <ul className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {videos.map((v, i) => (
          <Reveal as="li" key={v.id} delay={(i % 3) * 0.07}>
            <div className="relative aspect-video overflow-hidden rounded-3xl bg-gradient-to-br from-plum to-ink">
              <LiteYouTube id={v.id} title={v.title} thumbnail={v.thumbnail} />
            </div>
            <h3 className="mt-5 line-clamp-2 font-headline text-xl leading-snug text-text">
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="hover:text-plum">
                {v.title}<span className="sr-only"> (opens on YouTube)</span>
              </a>
            </h3>
            {v.published && <p className="mt-1 text-sm text-muted">{when(v.published)}</p>}
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
