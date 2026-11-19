import { ListVideo, ArrowUpRight } from "lucide-react";
import { getSermonSeries } from "@/lib/youtube";
import { Section, SectionHeader } from "@/components/ui/Section";
import LiteYouTube from "@/components/site/LiteYouTube";

function when(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * "Sermon Series" — each public playlist on HBG TV as one row of videos.
 * Read from YouTube's public playlist feeds, cached for an hour.
 * Renders nothing if the channel has no public playlists.
 */
export default async function SermonSeries({ tone = "parchment" }: { tone?: "ivory" | "parchment" | "white" }) {
  const series = await getSermonSeries();
  if (series.length === 0) return null;

  return (
    <Section tone={tone} aria-labelledby="series-title">
      <SectionHeader
        id="series-title"
        eyebrow="Teaching Series"
        title={<>Sermon <em className="text-gold-deep">Series</em></>}
        intro="Messages grouped as they were preached, so you can follow a word from its first night to its last."
      />
      <div className="space-y-16">
        {series.map((s) => (
          <section key={s.id} aria-labelledby={`series-${s.id}`}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <ListVideo size={22} className="text-gold-deep" aria-hidden />
                <h3 id={`series-${s.id}`} className="font-headline text-2xl text-text md:text-3xl">{s.title}</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted">
                  {s.videos.length} {s.videos.length === 1 ? "message" : "messages"}
                </span>
              </div>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-plum hover:text-gold-deep"
              >
                Full series on YouTube <ArrowUpRight size={15} aria-hidden />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
            <ul className="-mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8">
              {s.videos.map((v) => (
                <li key={v.id} className="w-[82%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]">
                  <div className="relative aspect-video overflow-hidden rounded-3xl bg-gradient-to-br from-plum to-ink">
                    <LiteYouTube id={v.id} title={v.title} thumbnail={v.thumbnail} />
                  </div>
                  <h4 className="mt-4 line-clamp-2 font-headline text-lg leading-snug text-text">
                    <a href={v.url} target="_blank" rel="noopener noreferrer" className="hover:text-plum">
                      {v.title}<span className="sr-only"> (opens on YouTube)</span>
                    </a>
                  </h4>
                  {v.published && <p className="mt-1 text-sm text-muted">{when(v.published)}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Section>
  );
}
