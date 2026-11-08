"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Play, Headphones, X, ExternalLink, Youtube } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { SOCIALS } from "@/lib/site";
import { thumbFor, youtubeId, videoUrlOf, type Vlog } from "@/components/VlogSection";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const CATEGORIES = ["All Messages", "Spiritual Growth", "The Holy Spirit", "Evangelism", "Prayer"];
const PAGE = 9;

type Player = { sermon: Vlog; kind: "video" | "audio" } | null;

function safeUrl(u?: string | null) {
  return u && /^https:\/\//.test(u) ? u : null;
}

export default function MediaLibrary() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [sermons, setSermons] = useState<Vlog[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [player, setPlayer] = useState<Player>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const fetchPage = useCallback(async (cat: string, from: number) => {
    let q = supabase.from("sermons").select("*").order("date_preached", { ascending: false }).range(from, from + PAGE - 1);
    if (cat !== "All Messages") q = q.eq("category", cat);
    const { data, error: err } = await q;
    if (err) throw err;
    return (data as Vlog[]) ?? [];
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    fetchPage(category, 0)
      .then((rows) => {
        if (cancelled) return;
        setSermons(rows);
        setHasMore(rows.length === PAGE);
        setError(false);
      })
      .catch((e) => {
        console.error("Error fetching sermons:", e);
        if (!cancelled) setError(true);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [category, fetchPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const rows = await fetchPage(category, sermons.length);
      setSermons((s) => [...s, ...rows]);
      setHasMore(rows.length === PAGE);
    } catch (e) {
      console.error(e);
      setError(true);
    }
    setLoadingMore(false);
  };

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (player && !d.open) d.showModal();
    if (!player && d.open) d.close();
  }, [player]);

  const vid = player ? youtubeId(videoUrlOf(player.sermon)) : null;
  const directVideo = player && !vid ? safeUrl(videoUrlOf(player.sermon)) : null;
  const audio = player ? safeUrl(player.sermon.audio_url) : null;

  return (
    <>
      <div role="group" aria-label="Filter by category" className="mb-12 flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={category === c}
            onClick={() => {
              if (c === category) return;
              setLoading(true);
              setCategory(c);
            }}
            className={cn(
              "rounded-full border px-5 py-2 text-sm font-semibold transition",
              category === c ? "border-plum bg-plum text-white" : "border-line bg-white text-muted hover:border-plum/40 hover:text-text",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading messages">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video rounded-3xl bg-parchment" />
              <div className="mt-5 h-6 w-3/4 rounded-full bg-parchment" />
            </div>
          ))}
        </div>
      ) : sermons.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white px-6 py-16 text-center">
          <p className="font-headline text-3xl text-text">{error ? "The archive is unavailable right now" : "No messages in this category yet"}</p>
          <p className="mx-auto mt-3 max-w-md text-muted">Every teaching, worship moment and testimony is also on our YouTube channel.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={SOCIALS.youtube} target="_blank" rel="noopener noreferrer" className={buttonClass("dark")}>
              <Youtube size={18} aria-hidden /> Watch on YouTube<span className="sr-only"> (opens in a new tab)</span>
            </a>
            {category !== "All Messages" && (
              <button type="button" onClick={() => { setLoading(true); setCategory("All Messages"); }} className={buttonClass("ghost-dark")}>
                Show all messages
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <ul className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {sermons.map((s) => {
              const canVideo = Boolean(youtubeId(videoUrlOf(s)) || safeUrl(videoUrlOf(s)));
              const canAudio = Boolean(safeUrl(s.audio_url));
              const thumb = thumbFor(s);
              return (
                <li key={s.id} className="group">
                  <div className="relative aspect-video overflow-hidden rounded-3xl bg-gradient-to-br from-plum to-ink">
                    {thumb ? (
                      <Image src={thumb} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" unoptimized={!thumb.startsWith("/")} className="object-cover transition duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Image src="/hbg-logo.png" alt="" width={90} height={74} className="h-12 w-auto opacity-60" /></div>
                    )}
                    {s.duration && <span className="absolute bottom-3 right-3 rounded-md bg-ink/80 px-2 py-1 text-[0.68rem] font-bold text-white">{s.duration}</span>}
                    {(canVideo || canAudio) && (
                      <div className="absolute inset-0 flex items-center justify-center gap-3 bg-ink/40 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                        {canVideo && (
                          <button type="button" onClick={() => setPlayer({ sermon: s, kind: "video" })} className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-ink" aria-label={`Watch: ${s.title}`}>
                            <Play size={22} fill="currentColor" className="ml-0.5" aria-hidden />
                          </button>
                        )}
                        {canAudio && (
                          <button type="button" onClick={() => setPlayer({ sermon: s, kind: "audio" })} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-ink" aria-label={`Listen: ${s.title}`}>
                            <Headphones size={22} aria-hidden />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {s.category && <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-gold-deep">{s.category}</p>}
                  <h3 className="mt-1 line-clamp-2 font-headline text-2xl leading-snug text-text">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {s.preacher}
                    {s.date_preached && ` · ${new Date(s.date_preached).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}`}
                  </p>
                  {!canVideo && !canAudio && <p className="mt-2 text-xs text-muted">Recording coming soon</p>}
                </li>
              );
            })}
          </ul>
          {hasMore && (
            <div className="mt-16 text-center">
              <button type="button" onClick={loadMore} disabled={loadingMore} className={buttonClass("ghost-dark")}>
                {loadingMore ? "Loading…" : "Load More Messages"}
              </button>
            </div>
          )}
        </>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setPlayer(null)}
        aria-labelledby="player-title"
        className="m-auto w-[min(960px,calc(100vw-2rem))] rounded-3xl bg-ink p-0 text-white backdrop:bg-ink/80 backdrop:backdrop-blur-sm"
      >
        {player && (
          <div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <h2 id="player-title" className="line-clamp-1 font-headline text-xl">{player.sermon.title}</h2>
              <button type="button" onClick={() => setPlayer(null)} className="rounded-full p-2 hover:bg-white/10" aria-label="Close player">
                <X size={20} aria-hidden />
              </button>
            </div>
            {player.kind === "video" && vid && (
              <div className="relative aspect-video">
                <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0`} title={player.sermon.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
              </div>
            )}
            {player.kind === "video" && !vid && directVideo && (
              <video className="aspect-video w-full bg-black" src={directVideo} controls autoPlay />
            )}
            {player.kind === "audio" && audio && (
              <div className="px-5 pb-6">
                <audio className="w-full" src={audio} controls autoPlay />
                <a href={audio} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-gold-soft">
                  <ExternalLink size={14} aria-hidden /> Open audio file
                </a>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
