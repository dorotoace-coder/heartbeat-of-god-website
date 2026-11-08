import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { SERVICE_TIMES } from "@/lib/site";
import HeroStage from "./HeroStage";
import HeroEmbers from "./HeroEmbers";
import type { CSSProperties } from "react";

/** Depth of a parallax layer: negative = far (moves against the cursor), positive = near. */
const depth = (d: number, s = 1) => ({ "--d": d, "--s": s }) as CSSProperties;

export default function Hero() {
  return (
    <HeroStage
      labelledBy="hero-title"
      className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-ink text-white md:items-center"
    >
      {/* Layer 1 — sky, sun and far ridges (locally generated scene) + god rays + sun glow */}
      <div aria-hidden className="hero3d-layer absolute inset-0" style={depth(-2, 1.16)}>
        <Image
          src="/hero-dawn.webp"
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover object-[70%_center]"
        />
        <div className="hero-sunglow absolute inset-0" />
        <div className="hero-rays" />
      </div>

      {/* Layer 2 — drifting valley mist */}
      <div aria-hidden className="hero3d-layer hero-mist absolute inset-0" style={depth(-1, 1.1)} />

      {/* Layer 3 — near ridgeline silhouette */}
      <div aria-hidden className="hero3d-layer absolute inset-x-0 -bottom-6" style={depth(0.6, 1.1)}>
        <Image src="/hero-ridge-near.webp" alt="" width={1600} height={494} sizes="100vw" className="h-auto w-full" />
      </div>

      {/* Readability scrim (static, so text contrast never moves) */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/20 md:bg-gradient-to-r md:from-ink/95 md:via-ink/60 md:to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />

      {/* Layer 4 — gold light motes, nearest decorative layer */}
      <div aria-hidden className="hero3d-layer pointer-events-none absolute inset-0" style={depth(1.2, 1.06)}>
        <HeroEmbers className="hero-embers h-full w-full" />
      </div>
      <div aria-hidden className="grain absolute inset-0 opacity-40" />

      {/* Layer 5 — content */}
      <div className="hero3d-layer relative mx-auto w-full max-w-7xl px-5 pb-16 pt-32 sm:px-8 md:pb-24" style={depth(0.35)}>
        <div className="max-w-2xl animate-fade-up">
          <Image src="/hbg-logo.png" alt="Heartbeat of God logo" width={110} height={90} className="mb-8 h-16 w-auto md:h-20" />
          <p className="mb-6 inline-flex items-center gap-3 text-[0.72rem] font-bold uppercase tracking-[0.26em] text-gold">
            <span aria-hidden className="h-px w-8 bg-gold/60" />A Global Movement for Spiritual Awakening
          </p>
          <h1 id="hero-title" className="hero-sheen font-headline text-balance text-5xl font-light leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            Bringing Men to the <em className="text-gold-soft">Consciousness</em> of God’s Presence
          </h1>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/watch" className={buttonClass("gold")}>
              <Play size={17} fill="currentColor" aria-hidden /> Watch Live
            </Link>
            <Link href="/give" className={buttonClass("ghost-light")}>Give Now</Link>
            <Link href="/departments" className="group ml-1 inline-flex items-center gap-2 px-2 py-3 text-sm font-semibold text-white/80 hover:text-white">
              Join the Movement <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </div>

        <dl className="mt-16 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
          {SERVICE_TIMES.map((s) => (
            <div key={s.name} className="bg-ink/70 px-5 py-4 backdrop-blur">
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/60">{s.name}</dt>
              <dd className="mt-1 font-headline text-xl text-white">
                {s.day} · <span className="text-gold-soft">{s.time}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </HeroStage>
  );
}
