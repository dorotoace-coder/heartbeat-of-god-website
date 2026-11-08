"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Youtube, ArrowRight } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { SOCIALS } from "@/lib/site";
import { buttonClass } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Section";

export interface Vlog {
  id: string;
  title: string;
  preacher: string;
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

function Thumb({ v, sizes, className = "" }: { v: Vlog; sizes: string; className?: string }) {
  const src = thumbFor(v);
  if (!src) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-plum to-ink ${className}`}>
        <Image src="/hbg-logo.png" alt="" width={80} height={66} className="h-10 w-auto opacity-60" />
      </div>
    );
  }
  return <Image src={src} alt="" fill sizes={sizes} unoptimized={!src.startsWith("/")} className={`object-cover ${className}`} />;
}

export default function VlogSection() {
  const [vlogs, setVlogs] = useState<Vlog[]>([]);
  const [featured, setFeatured] = useState<Vlog | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    supabase
      .from("sermons")
      .select("*")
      .order("date_preached", { ascending: false })
      .limit(7)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Failed to load vlogs:", error);
        // Only list messages that can actually be played.
        const rows = ((data as Vlog[]) || []).filter((v) => youtubeId(videoUrlOf(v)));
        setVlogs(rows);
        setFeatured(rows[0] ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const featuredVid = youtubeId(videoUrlOf(featured));

  return (
    <section aria-labelledby="vlog-title" className="relative overflow-hidden bg-ink px-5 py-20 text-white sm:px-8 md:py-28">
      <div aria-hidden className="pointer-events-none absolute -left-40 top-1/4 h-[480px] w-[480px] rounded-full bg-lilac/10 blur-[130px]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <Eyebrow tone="dark">Heartbeat Vlog</Eyebrow>
            <h2 id="vlog-title" className="font-headline text-4xl font-light leading-tight md:text-[3.25rem]">
              Watch the <em className="text-gold-soft">Latest</em>
            </h2>
          </div>
          <Link href="/media" className="group inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white">
            Full Media Archive <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Loading messages">
            <div className="aspect-video animate-pulse rounded-3xl bg-white/[0.05] lg:col-span-2" />
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.05]" />)}</div>
          </div>
        ) : !featured ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center md:p-16">
            <Youtube size={34} className="mx-auto mb-5 text-gold" aria-hidden />
            <h3 className="font-headline text-3xl">New messages are on the way</h3>
            <p className="mx-auto mt-3 max-w-md text-white/65">Catch every teaching, worship moment, and testimony on our YouTube channel.</p>
            <a href={SOCIALS.youtube} target="_blank" rel="noopener noreferrer" className={buttonClass("gold", "lg", "mt-8")}>
              <Youtube size={18} aria-hidden /> Watch on YouTube<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] lg:col-span-2">
              <div className="relative aspect-video">
                {playing && featuredVid ? (
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube-nocookie.com/embed/${featuredVid}?autoplay=1&rel=0`}
                    title={featured.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 text-left" aria-label={`Play: ${featured.title}`}>
                    <Thumb v={featured} sizes="(min-width: 1024px) 66vw, 100vw" className="opacity-80 transition duration-700 group-hover:scale-[1.02] group-hover:opacity-100" />
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gold text-ink shadow-[0_0_50px_rgba(217,180,90,0.5)] transition group-hover:scale-110">
                        <Play size={30} fill="currentColor" className="ml-1" aria-hidden />
                      </span>
                    </span>
                    <span className="absolute bottom-6 left-6 right-6">
                      {featured.category && <span className="mb-2 block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-gold">{featured.category}</span>}
                      <span className="block font-headline text-2xl leading-tight text-white md:text-3xl">{featured.title}</span>
                      <span className="mt-1 block text-sm text-white/70">{featured.preacher}{featured.duration ? ` · ${featured.duration}` : ""}</span>
                    </span>
                  </button>
                )}
              </div>
            </div>
            <ul className="space-y-3">
              {vlogs.slice(0, 4).map((v) => {
                const active = featured.id === v.id;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => { setFeatured(v); setPlaying(false); }}
                      aria-pressed={active}
                      className={`group flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition ${active ? "border-gold/50 bg-gold/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
                    >
                      <span className="relative h-16 w-28 shrink-0 overflow-hidden rounded-xl">
                        <Thumb v={v} sizes="112px" />
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 block text-sm font-semibold leading-snug text-white">{v.title}</span>
                        <span className="mt-1 block text-xs text-white/55">{v.preacher}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
