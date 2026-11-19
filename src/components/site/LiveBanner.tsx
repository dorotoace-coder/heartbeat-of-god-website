"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

type Live = { live: boolean; videoId: string | null; title: string | null };

/**
 * Slim "LIVE NOW on HBG TV — Join" bar. Asks /api/live (a server check of
 * whether @HBG_tv is live on YouTube, cached ~2 min) and renders nothing
 * unless the stream is actually on air. Hidden on /watch itself.
 */
export default function LiveBanner() {
  const pathname = usePathname();
  const [live, setLive] = useState<Live | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      fetch("/api/live")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Live | null) => {
          if (!cancelled) setLive(d && d.live ? d : null);
        })
        .catch(() => {});
    check();
    const id = window.setInterval(check, 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!live || pathname?.startsWith("/watch")) return null;

  return (
    <div className="border-b border-white/10 bg-plum">
      <Link
        href="/watch"
        className="group mx-auto flex max-w-7xl items-center justify-center gap-2.5 px-5 py-2 text-xs font-semibold tracking-wide text-white sm:px-8 sm:text-sm"
      >
        <span className="relative inline-flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        <span className="uppercase tracking-[0.18em] text-gold-soft">Live now</span>
        <span className="hidden sm:inline">on HBG TV</span>
        <span aria-hidden className="text-white/40">—</span>
        <span className="inline-flex items-center gap-1 text-gold transition group-hover:text-gold-soft">
          Join <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </div>
  );
}
