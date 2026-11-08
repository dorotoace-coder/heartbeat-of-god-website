"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";

/**
 * Click-to-play YouTube: shows YouTube's own thumbnail (lazy) and only loads
 * the privacy-enhanced player after a click, so pages stay fast.
 */
export default function LiteYouTube({
  id,
  title,
  thumbnail,
  priority = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
}: {
  id: string;
  title: string;
  thumbnail?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const src = thumbnail ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  if (playing) {
    return (
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group absolute inset-0 block h-full w-full overflow-hidden bg-ink text-left"
      aria-label={`Play: ${title}`}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes={sizes}
        unoptimized
        loading={priority ? "eager" : "lazy"}
        className="object-cover transition duration-700 group-hover:scale-105"
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
      <span aria-hidden className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gold text-ink shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] transition group-hover:scale-110">
        <Play size={24} fill="currentColor" className="ml-1" />
      </span>
    </button>
  );
}
