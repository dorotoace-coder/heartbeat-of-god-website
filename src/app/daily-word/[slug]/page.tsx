import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Instagram, Youtube } from "lucide-react";
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

export default async function DailyWordPost({ params }: { params: Params }) {
  const { slug } = await params;
  const word = await getDailyWordBySlug(slug);
  if (!word) notFound();
  const { prev, next } = await getDailyWordNeighbours(word);
  const url = `${SITE_URL}/daily-word/${word.slug}`;
  const image = safeHttpsUrl(word.image_url);
  const translation = translationOf(word.scripture_ref);
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
      <main id="main-content">
        <header className="hero-aura relative overflow-hidden px-5 pb-20 pt-36 text-white sm:px-8 md:pb-24 md:pt-44">
          <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-3xl animate-fade-up">
            <Link href="/daily-word" className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
              <ArrowLeft size={15} aria-hidden /> All Daily Words
            </Link>
            <Eyebrow tone="dark">
              Daily Word · <time dateTime={word.publish_date}>{formatPublishDate(word.publish_date)}</time>
            </Eyebrow>
            <h1 className="font-headline text-balance text-5xl font-light leading-[1.05] tracking-tight md:text-6xl">{word.title}</h1>
            <figure className="mt-10 border-l-2 border-gold/70 pl-6">
              <blockquote className="font-headline text-pretty text-2xl font-light italic leading-snug text-white/90 md:text-3xl">
                “{word.scripture_text}”
              </blockquote>
              <figcaption className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-gold">
                {translation.ref} <span className="font-medium normal-case tracking-normal text-white/50">· {translation.long}</span>
              </figcaption>
            </figure>
          </div>
        </header>

        <Section tone="ivory" containerClassName="max-w-3xl" aria-labelledby="devotional-title">
          <h2 id="devotional-title" className="sr-only">Devotional</h2>
          {image && (
            <div className="relative mb-12 aspect-[16/10] overflow-hidden rounded-3xl bg-parchment">
              <Image src={image} alt="" fill sizes="(min-width: 768px) 768px, 100vw" unoptimized className="object-cover" />
            </div>
          )}
          <Markdown
            source={word.devotional}
            className="text-lg leading-relaxed text-text [&_a]:font-semibold [&_a]:text-plum [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-8 [&_blockquote]:border-l-2 [&_blockquote]:border-gold [&_blockquote]:pl-5 [&_blockquote]:font-headline [&_blockquote]:text-2xl [&_blockquote]:italic [&_h2]:mb-4 [&_h2]:mt-12 [&_h2]:font-headline [&_h2]:text-3xl [&_h3]:mb-3 [&_h3]:mt-10 [&_h3]:font-headline [&_h3]:text-2xl [&_li]:mt-2 [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-6 [&_p:first-child]:mt-0 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6"
          />

          {clips.length > 0 && (
            <div className="mt-12 flex flex-wrap gap-3">
              {clips.map(({ href, label, Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-text hover:border-plum/40 hover:text-plum">
                  <Icon /> {label}<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ))}
            </div>
          )}

          <div className="mt-14 border-t border-line pt-8">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gold-deep">Share this Word</p>
            <ShareButtons url={url} title={`${word.title} — ${word.scripture_ref}`} text="Today’s Daily Word from Heartbeat of God" />
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
