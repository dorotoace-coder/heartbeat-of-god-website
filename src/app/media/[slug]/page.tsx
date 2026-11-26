import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowLeft, Download, Headphones, Youtube } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShareButtons from "@/components/site/ShareButtons";
import FollowHBG from "@/components/site/FollowHBG";
import JsonLd from "@/components/site/JsonLd";
import LiteYouTube from "@/components/site/LiteYouTube";
import { buttonClass } from "@/components/ui/Button";
import { Eyebrow, Section } from "@/components/ui/Section";
import {
  formatPreached,
  getRecentSermons,
  getSermon,
  getSermonLinks,
  isOwnFile,
  safeHttps,
  sameOriginPath,
  sermonIdFrom,
  sermonPath,
  sermonUrl,
  thumbFor,
  videoUrlOf,
  youtubeId,
  type Vlog,
} from "@/lib/sermons";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const rows = await getSermonLinks();
  return rows.slice(0, 40).map((r) => ({ slug: sermonPath(r).slice("/media/".length) }));
}

async function load(slug: string): Promise<Vlog | null> {
  const id = sermonIdFrom(slug);
  return id ? getSermon(id) : null;
}

function absolute(u: string): string {
  return u.startsWith("/") ? `${SITE_URL}${u}` : u;
}

function describe(s: Vlog): string {
  const when = formatPreached(s.date_preached);
  const base = `A message by ${s.preacher}${when ? `, preached ${when}` : ""}.`;
  const body = s.description?.trim();
  if (!body) return `${base} Watch, listen and share from Heartbeat of God Ministry.`;
  return body.length > 150 ? `${body.slice(0, 150).replace(/\s+\S*$/, "").replace(/[\s.,;:]+$/, "")}…` : body;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const s = await load(slug);
  if (!s) return { title: "Message", robots: { index: false } };
  const url = sermonUrl(s);
  const description = describe(s);
  const social = `${s.title} · ${s.preacher} | Heartbeat of God`;
  const thumb = thumbFor(s);
  const images = thumb
    ? [{ url: absolute(thumb), alt: s.title }]
    : [{ url: "/pastor-amos-2026.jpg", width: 1412, height: 946, alt: `${s.preacher}, Heartbeat of God Ministry` }];
  return {
    title: s.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: youtubeId(videoUrlOf(s)) ? "video.other" : "music.song",
      url,
      siteName: SITE_NAME,
      title: social,
      description,
      images,
      locale: "en_CA",
    },
    twitter: { card: "summary_large_image", title: social, description, images: images.map((i) => i.url) },
  };
}

export default async function MessagePage({ params }: { params: Params }) {
  const { slug } = await params;
  const s = await load(slug);
  if (!s) notFound();
  // Old or edited titles still resolve by id; send people to the current link.
  const canonical = sermonPath(s);
  if (`/media/${slug}` !== canonical) permanentRedirect(canonical);

  const more = await getRecentSermons(s.id, 3);
  const url = sermonUrl(s);
  const vid = youtubeId(videoUrlOf(s));
  const directVideo = !vid ? safeHttps(videoUrlOf(s)) : null;
  const audio = safeHttps(s.audio_url);
  const thumb = thumbFor(s);
  const when = formatPreached(s.date_preached);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": vid || directVideo ? "VideoObject" : "AudioObject",
          name: s.title,
          description: describe(s),
          url,
          ...(thumb ? { thumbnailUrl: absolute(thumb) } : {}),
          ...(s.date_preached ? { uploadDate: s.date_preached } : {}),
          ...(vid ? { embedUrl: `https://www.youtube.com/embed/${vid}` } : {}),
          ...(!vid && (directVideo || audio) ? { contentUrl: directVideo || audio } : {}),
          author: { "@type": "Person", name: s.preacher },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            logo: { "@type": "ImageObject", url: `${SITE_URL}/hbg-logo.png` },
          },
        }}
      />
      <Navbar />
      <main id="main-content">
        <header className="hero-aura relative overflow-hidden px-5 pb-16 pt-36 text-white sm:px-8 md:pb-20 md:pt-44">
          <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-60" />
          <div className="relative mx-auto max-w-4xl animate-fade-up">
            <div className="mb-8">
              <Link href="/media" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
                <ArrowLeft size={15} aria-hidden /> All Messages
              </Link>
            </div>
            <Eyebrow tone="dark">
              {s.category || "Message"}
              {when && (
                <>
                  {" · "}
                  <time dateTime={s.date_preached ?? undefined}>{when}</time>
                </>
              )}
            </Eyebrow>
            <h1 className="font-headline text-balance text-5xl font-light leading-[1.05] tracking-tight md:text-6xl">{s.title}</h1>
            <p className="mt-5 text-lg text-white/70">
              {s.preacher}
              {s.duration && ` · ${s.duration}`}
            </p>
          </div>
        </header>

        <Section tone="ivory" containerClassName="max-w-4xl" aria-labelledby="player-title">
          <h2 id="player-title" className="sr-only">
            {vid || directVideo ? "Watch" : "Listen"}
          </h2>

          {vid ? (
            <div className="relative aspect-video overflow-hidden rounded-3xl bg-ink shadow-[0_40px_90px_-40px_rgba(28,10,45,0.7)]">
              <LiteYouTube id={vid} title={s.title} priority sizes="(min-width: 1024px) 896px, 100vw" />
            </div>
          ) : directVideo ? (
            <video className="aspect-video w-full rounded-3xl bg-black" src={directVideo} poster={thumb ?? undefined} controls preload="metadata" />
          ) : audio ? (
            <div className="overflow-hidden rounded-3xl bg-ink shadow-[0_40px_90px_-40px_rgba(28,10,45,0.7)]">
              {thumb && (
                <div className="relative aspect-video">
                  <Image src={thumb} alt="" fill priority sizes="(min-width: 1024px) 896px, 100vw" unoptimized={!thumb.startsWith("/")} className="object-cover" />
                </div>
              )}
              <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
                <Headphones size={22} className="shrink-0 text-gold" aria-hidden />
                <audio className="w-full" src={audio} controls preload="metadata" aria-label={`Listen: ${s.title}`} />
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center">
              <p className="font-headline text-3xl text-text">Recording coming soon</p>
            </div>
          )}

          {(isOwnFile(audio) || vid) && (
            <div className="mt-6 flex flex-wrap gap-3">
              {audio && isOwnFile(audio) && (
                <a href={sameOriginPath(audio)} download className={buttonClass("dark", "md")}>
                  <Download size={16} aria-hidden /> Download audio
                </a>
              )}
              {vid && (
                <a href={`https://www.youtube.com/watch?v=${vid}`} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost-dark", "md")}>
                  <Youtube size={16} aria-hidden /> Watch on YouTube<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
          )}

          {s.description?.trim() && (
            <p className="mt-10 whitespace-pre-line text-lg leading-relaxed text-text">{s.description.trim()}</p>
          )}

          <div className="mt-14 border-t border-line pt-8">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-gold-deep">Share this message</p>
            <ShareButtons url={url} title={`${s.title} — ${s.preacher}`} text="A message from Heartbeat of God Ministry" />
          </div>

          {more.length > 0 && (
            <nav aria-label="More messages" className="mt-16">
              <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-gold-deep">More messages</p>
              <ul className="grid gap-6 sm:grid-cols-3">
                {more.map((m) => {
                  const t = thumbFor(m);
                  return (
                    <li key={m.id}>
                      <Link href={sermonPath(m)} className="group block">
                        <span className="relative block aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-plum to-ink">
                          {t && <Image src={t} alt="" fill sizes="(min-width: 640px) 280px, 100vw" unoptimized={!t.startsWith("/")} className="object-cover transition duration-700 group-hover:scale-105" />}
                        </span>
                        <span className="mt-3 line-clamp-2 block font-headline text-lg leading-snug text-text group-hover:text-plum">{m.title}</span>
                        <span className="mt-1 block text-xs text-muted">{m.preacher}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
        </Section>

        <Section tone="parchment" aria-labelledby="follow-title">
          <h2 id="follow-title" className="mb-8 text-center font-headline text-3xl text-text md:text-4xl">
            Never miss a <em className="text-gold-deep">message</em>
          </h2>
          <FollowHBG />
        </Section>
      </main>
      <Footer />
    </>
  );
}
