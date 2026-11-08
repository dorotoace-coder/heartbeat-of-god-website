import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { SERVICE_TIMES } from "@/lib/site";

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-ink text-white md:items-center">
      {/* Local photograph — no hotlinked images */}
      <Image
        src="/pastor-amos-pro.jpg"
        alt="Pastor Amos Unogwu, founder of Heartbeat of God Ministry"
        fill
        preload
        sizes="100vw"
        className="-z-20 object-cover object-[70%_center] opacity-60 md:opacity-90"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/80 to-ink/30 md:bg-gradient-to-r md:from-ink md:via-ink/85 md:to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" />
      <div aria-hidden className="grain absolute inset-0 -z-10 opacity-50" />

      <div className="mx-auto w-full max-w-7xl px-5 pb-16 pt-32 sm:px-8 md:pb-24">
        <div className="max-w-2xl animate-fade-up">
          <Image src="/hbg-logo.png" alt="Heartbeat of God logo" width={110} height={90} className="mb-8 h-16 w-auto md:h-20" />
          <p className="mb-6 inline-flex items-center gap-3 text-[0.72rem] font-bold uppercase tracking-[0.26em] text-gold">
            <span aria-hidden className="h-px w-8 bg-gold/60" />A Global Movement for Spiritual Awakening
          </p>
          <h1 id="hero-title" className="font-headline text-balance text-5xl font-light leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
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
    </section>
  );
}
