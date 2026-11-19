import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, CheckSquare, CircleHelp, Download, Feather, HandHeart, Instagram, KeyRound, ShieldCheck, Users, Youtube, type LucideIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShareButtons from "@/components/site/ShareButtons";
import FollowHBG from "@/components/site/FollowHBG";
import JsonLd from "@/components/site/JsonLd";
import { Eyebrow, Section } from "@/components/ui/Section";
import { Markdown } from "@/lib/markdown";
import { excerpt, formatPublishDate, safeHttpsUrl, translationOf } from "@/lib/dailyWord";
import { getDailyWordBySlug, getDailyWordNeighbours, getPublishedDailyWordSlugs } from "@/lib/dailyWordData";
import { FOUNDER, SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const rows = await getPublishedDailyWordSlugs();
  return rows.slice(0, 60).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const word = await getDailyWordBySlug(slug);
  if (!word) return { title: "Daily Word", robots: { index: false } };
  const url = `${SITE_URL}/daily-word/${word.slug}`;
  const description = `${word.scripture_ref} — ${excerpt(word.devotional || word.scripture_text, 150)}`;
  const social = `${word.title} · Daily Word | Heartbeat of God`;
  return {
    title: `${word.title} · Daily Word`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: SITE_NAME,
      title: social,
      description,
      publishedTime: `${word.publish_date}T00:00:00Z`,
      locale: "en_CA",
    },
    twitter: { card: "summary_large_image", title: social, description },
  };
}

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
  </svg>
);

const YouTubeIcon = () => <Youtube size={16} aria-hidden />;
const InstagramIcon = () => <Instagram size={16} aria-hidden />;

const SECTION_ICONS: Record<string, LucideIcon> = {
  "Key Word": KeyRound,
  "Word Focus": Feather,
  "Bible Insight": Users,
  Prayer: HandHeart,
  Confession: ShieldCheck,
  "Action Point": CheckSquare,
  "CLT Questions": CircleHelp,
};

function cltSections(source: string) {
  return source.split(/^##\s+/m).slice(1).map((chunk) => {
    const [heading = "", ...body] = chunk.split("\n");
    return { heading: heading.trim(), body: body.join("\n").trim() };
  });
}

export default async function DailyWordPost({ params }: { params: Params }) {
  const { slug } = await params;
  const word = await getDailyWordBySlug(slug);
  if (!word) notFound();
  const { prev, next } = await getDailyWordNeighbours(word);
  const url = `${SITE_URL}/daily-word/${word.slug}`;
  const image = safeHttpsUrl(word.image_url);
  const month = word.publish_date.slice(0, 7);
  const sections = cltSections(word.devotional);
  const translation = translationOf(word.scripture_ref);
  const downloadable = Boolean(image && process.env.NEXT_PUBLIC_SUPABASE_URL && image.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/clt-devotionals/`));
  const clips = [
    { href: safeHttpsUrl(word.youtube_url), label: "Watch on YouTube", Icon: YouTubeIcon },
    { href: safeHttpsUrl(word.instagram_url), label: "View on Instagram", Icon: InstagramIcon },
    { href: safeHttpsUrl(word.tiktok_url), label: "Watch on TikTok", Icon: TikTokIcon },
  ].filter((c): c is { href: string; label: string; Icon: () => React.JSX.Element } => Boolean(c.href));

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: word.title,
          description: `${word.scripture_ref} — ${excerpt(word.devotional || word.scripture_text, 150)}`,
          datePublished: `${word.publish_date}T00:00:00Z`,
          dateModified: word.created_at,
          mainEntityOfPage: url,
          url,
          image: [image ?? `${url}/opengraph-image`],
          author: { "@type": "Person", name: FOUNDER },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            logo: { "@type": "ImageObject", url: `${SITE_URL}/hbg-logo.png` },
          },
          articleSection: "Daily Word",
          citation: `${translation.ref} (${translation.short})`,
        }}
      />
      <Navbar />
      <main id="main-content" className="bg-white pt-[68px]">
        <header className="relative overflow-hidden bg-plum px-5 py-12 text-white sm:px-8">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_76%_45%,rgba(255,200,61,0.38),transparent_22%),radial-gradient(circle_at_83%_100%,rgba(130,20,40,0.8),transparent_35%),linear-gradient(115deg,#21052f,#510a3c)]" />
          <div className="relative mx-auto max-w-4xl">
            <p className="font-headline text-4xl text-gold-soft sm:text-5xl">HBG-CLT <span className="block text-2xl text-white">Daily Word</span></p>
            <p className="mt-3 font-headline text-lg italic text-gold-soft">Come, Listen, Take Heed</p>
          </div>
        </header>

        <Section tone="ivory" containerClassName="max-w-4xl" aria-labelledby="devotional-title">
          <div className="rounded-[2rem] bg-white p-5 shadow-[0_20px_55px_-35px_rgba(28,10,45,0.45)] sm:p-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="rounded-md bg-plum px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">HBG-CLT</span>
            <ShareButtons url={url} title={`${word.title} — ${word.scripture_ref}`} text="Today’s Daily Word from Heartbeat of God" />
          </div>
          <p className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted"><time dateTime={word.publish_date}>{formatPublishDate(word.publish_date, "short")}</time><span>Pastor Amos Unogwu</span></p>
          <h1 id="devotional-title" className="mt-4 font-headline text-4xl font-semibold leading-tight text-text sm:text-5xl">{word.title}</h1>
          <p className="mt-2 font-headline text-xl italic text-plum">Divine Preservation</p>
          <section className="mt-8 border-l-[6px] border-gold bg-[#fff8e8] px-5 py-6" aria-labelledby="scripture-title">
            <div className="flex gap-4"><BookOpen className="mt-1 shrink-0 text-gold-deep" aria-hidden /><div><h2 id="scripture-title" className="font-bold text-plum">Opening Scripture</h2><p className="mt-1 font-headline text-lg italic leading-relaxed text-text">“{word.scripture_text}” — {translation.ref} ({translation.short})</p></div></div>
          </section>
          <div className="mt-8 space-y-7">
            {sections.map(({ heading, body }) => {
              const Icon = SECTION_ICONS[heading] ?? BookOpen;
              const [main, takeaway] = body.split(/\n>\s*/);
              return <section key={heading} className="flex gap-4" aria-labelledby={`section-${heading.replace(/\s+/g, "-").toLowerCase()}`}><span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#efe4f7] text-plum"><Icon size={20} aria-hidden /></span><div className="min-w-0 flex-1"><h2 id={`section-${heading.replace(/\s+/g, "-").toLowerCase()}`} className="font-bold text-lg text-plum">{heading}</h2><Markdown source={main.trim()} className="mt-1 leading-relaxed text-text [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-2" />{takeaway && <blockquote className="mt-5 border-l-4 border-gold pl-4 font-headline text-lg font-semibold italic text-[#70410c]">{takeaway.trim()}</blockquote>}</div></section>;
            })}
          </div>
          {image && (
            <figure className="mt-10">
              <div className="overflow-hidden rounded-2xl bg-parchment">
                <Image
                  src={image}
                  alt={`Complete HBG-CLT devotional artwork: ${word.title}, ${formatPublishDate(word.publish_date)}`}
                  width={995}
                  height={1536}
                  sizes="(min-width: 768px) 768px, 100vw"
                  unoptimized
                  className="h-auto w-full object-contain"
                />
              </div>
              <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-muted">Shareable HBG-CLT devotional · original portrait preserved</span>
              </figcaption>
            </figure>
          )}
          {clips.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-3">
              {clips.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-text hover:border-plum/40 hover:text-plum">
                  <Icon /> {label}<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ))}
            </div>
          )}

          <div className="mt-10 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
            {downloadable && <a href={`/api/daily-word-image?slug=${encodeURIComponent(word.slug)}`} download={`hbg-clt-${word.publish_date}.png`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-plum px-5 py-3 font-semibold text-white hover:bg-plum-soft"><Download size={18} aria-hidden /> Download CLT Image</a>}
            <Link href={`/daily-word?month=${month}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-plum px-5 py-3 font-semibold text-plum hover:bg-[#f7f1fb]"><CalendarDays size={18} aria-hidden /> View {formatPublishDate(word.publish_date, "long").split(" ")[1]} CLT Archive</Link>
          </div>

          {(prev || next) && (
            <nav aria-label="More Daily Words" className="mt-14 grid gap-4 sm:grid-cols-2">
              {prev ? (
                <Link href={`/daily-word/${prev.slug}`} rel="prev" className="group rounded-3xl border border-line bg-white p-6 transition hover:border-gold/60">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted">
                    <ArrowLeft size={14} aria-hidden /> Previous
                  </span>
                  <span className="mt-2 block font-headline text-xl text-text group-hover:text-plum">{prev.title}</span>
                  <span className="mt-1 block text-sm text-muted">{formatPublishDate(prev.publish_date, "short")}</span>
                </Link>
              ) : <span />}
              {next && (
                <Link href={`/daily-word/${next.slug}`} rel="next" className="group rounded-3xl border border-line bg-white p-6 text-right transition hover:border-gold/60">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted">
                    Next <ArrowRight size={14} aria-hidden />
                  </span>
                  <span className="mt-2 block font-headline text-xl text-text group-hover:text-plum">{next.title}</span>
                  <span className="mt-1 block text-sm text-muted">{formatPublishDate(next.publish_date, "short")}</span>
                </Link>
              )}
            </nav>
          )}
          </div>
        </Section>

        <Section tone="parchment" aria-labelledby="follow-title">
          <h2 id="follow-title" className="mb-8 text-center font-headline text-3xl text-text md:text-4xl">
            Receive the Word <em className="text-gold-deep">daily</em>
          </h2>
          <FollowHBG />
        </Section>
      </main>
      <Footer />
    </>
  );
}
