import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Search, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/site/PageHero";
import FollowHBG from "@/components/site/FollowHBG";
import { Section } from "@/components/ui/Section";
import { buttonClass } from "@/components/ui/Button";
import { ARCHIVE_PAGE_SIZE, getDailyWordArchive } from "@/lib/dailyWordData";
import { excerpt, formatPublishDate } from "@/lib/dailyWord";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Daily Word",
  description:
    "The Daily Word from Heartbeat of God Ministry — a scripture and a short devotional to carry the consciousness of God’s presence through your day.",
  path: "/daily-word",
});

type SP = Promise<{ q?: string | string[]; page?: string | string[] }>;

function first(v?: string | string[]) {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function pageHref(q: string, page: number) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `/daily-word?${s}` : "/daily-word";
}

export default async function DailyWordArchive({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, 80);
  const page = Math.max(1, Math.min(500, parseInt(first(sp.page), 10) || 1));
  const { items, total, error } = await getDailyWordArchive({ query: q, page });
  const pages = Math.max(1, Math.ceil(total / ARCHIVE_PAGE_SIZE));
  const libraryEmpty = !q && total === 0 && page === 1;

  return (
    <>
      <Navbar />
      <main id="main-content">
        <PageHero
          eyebrow="Daily Word"
          title={<>A Word for <em className="text-gold-soft">Today</em></>}
          intro="One scripture and a short devotional each day, to carry the consciousness of God’s presence into ordinary hours."
        />

        <Section tone="ivory" aria-labelledby="archive-title">
          <h2 id="archive-title" className="sr-only">Daily Word archive</h2>

          {libraryEmpty ? (
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-line bg-white px-6 py-14 text-center md:px-14">
              <BookOpen size={30} className="mx-auto text-gold-deep" aria-hidden />
              <p className="mt-6 font-headline text-3xl text-text md:text-4xl">
                {error ? "The Daily Word library is unavailable right now" : "The first Daily Word is coming soon"}
              </p>
              <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted">
                Follow HBG to receive each Word the day it is released — on YouTube, Instagram and TikTok.
              </p>
              <FollowHBG className="mt-10 text-left" />
            </div>
          ) : (
            <>
              <form action="/daily-word" method="get" role="search" className="mx-auto mb-12 flex max-w-2xl items-center gap-2 rounded-full border border-line bg-white p-1.5 pl-5 focus-within:border-plum/50">
                <Search size={18} className="shrink-0 text-muted" aria-hidden />
                <label htmlFor="dw-search" className="sr-only">Search the Daily Word by text or scripture</label>
                <input
                  id="dw-search"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Search by text or scripture, e.g. Psalm 23"
                  className="min-w-0 flex-1 bg-transparent py-2 text-text placeholder:text-muted/70 focus:outline-none"
                />
                {q && (
                  <Link href="/daily-word" className="rounded-full p-2 text-muted hover:bg-parchment hover:text-text" aria-label="Clear search">
                    <X size={16} aria-hidden />
                  </Link>
                )}
                <button type="submit" className={buttonClass("dark", "md")}>Search</button>
              </form>

              {q && (
                <p className="mb-8 text-center text-sm text-muted" aria-live="polite">
                  {total === 0 ? "No Daily Word matches" : `${total} ${total === 1 ? "result" : "results"} for`} “{q}”
                </p>
              )}

              {items.length === 0 ? (
                <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center">
                  <p className="font-headline text-2xl text-text">{error ? "Search is unavailable right now" : "Nothing found on this page"}</p>
                  <Link href="/daily-word" className={buttonClass("ghost-dark", "md", "mt-6")}>Back to all Daily Words</Link>
                </div>
              ) : (
                <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((w) => (
                    <li key={w.id}>
                      <Link
                        href={`/daily-word/${w.slug}`}
                        className="group flex h-full flex-col rounded-3xl border border-line bg-white p-7 transition hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_30px_60px_-35px_rgba(27,20,36,0.45)]"
                      >
                        <time dateTime={w.publish_date} className="text-xs font-bold uppercase tracking-[0.18em] text-gold-deep">
                          {formatPublishDate(w.publish_date, "short")}
                        </time>
                        <h3 className="mt-3 font-headline text-2xl leading-snug text-text">{w.title}</h3>
                        <p className="mt-2 text-sm font-semibold text-plum">{w.scripture_ref}</p>
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{excerpt(w.devotional || w.scripture_text, 160)}</p>
                        <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-plum">
                          Read <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {pages > 1 && (
                <nav aria-label="Daily Word pages" className="mt-14 flex items-center justify-center gap-3">
                  {page > 1 ? (
                    <Link href={pageHref(q, page - 1)} className={buttonClass("ghost-dark", "md")} rel="prev">
                      <ArrowLeft size={16} aria-hidden /> Newer
                    </Link>
                  ) : (
                    <span className={buttonClass("ghost-dark", "md", "pointer-events-none opacity-40")} aria-hidden>
                      <ArrowLeft size={16} /> Newer
                    </span>
                  )}
                  <span className="px-3 text-sm text-muted">Page {page} of {pages}</span>
                  {page < pages ? (
                    <Link href={pageHref(q, page + 1)} className={buttonClass("ghost-dark", "md")} rel="next">
                      Older <ArrowRight size={16} aria-hidden />
                    </Link>
                  ) : (
                    <span className={buttonClass("ghost-dark", "md", "pointer-events-none opacity-40")} aria-hidden>
                      Older <ArrowRight size={16} />
                    </span>
                  )}
                </nav>
              )}
            </>
          )}
        </Section>

        {!libraryEmpty && (
          <Section tone="parchment" aria-labelledby="follow-title">
            <h2 id="follow-title" className="mb-8 text-center font-headline text-3xl text-text md:text-4xl">
              Follow <em className="text-gold-deep">HBG</em>
            </h2>
            <FollowHBG />
          </Section>
        )}
      </main>
      <Footer />
    </>
  );
}
