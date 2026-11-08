import Image from "next/image";
import { CalendarDays, MapPin, Sparkles, User, ArrowUpRight } from "lucide-react";
import { currentEvent, hasEnded } from "@/config/currentEvent";
import { buttonClass } from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";

/** The ministry's current headline programme — content from src/config/currentEvent.ts */
export default function FeaturedEvent({ headingLevel = "h2" }: { headingLevel?: "h1" | "h2" }) {
  const ended = hasEnded();
  const H = headingLevel;
  const meta = [
    { Icon: CalendarDays, text: currentEvent.dateLabel },
    { Icon: MapPin, text: currentEvent.venue },
    { Icon: Sparkles, text: currentEvent.admission },
    { Icon: User, text: currentEvent.host },
  ];

  return (
    <Reveal>
      <article className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-plum via-ink to-plum text-white shadow-[0_40px_100px_-40px_rgba(14,7,22,0.9)]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold/15 blur-[100px]" />
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          {currentEvent.flyer && (
            <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[520px]">
              <Image
                src={currentEvent.flyer}
                alt={`${currentEvent.name} — ${currentEvent.subtitle} flyer`}
                fill
                sizes="(min-width: 768px) 45vw, 100vw"
                className="object-cover object-top"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-ink/40" />
            </div>
          )}
          <div className="relative flex flex-col justify-center p-8 sm:p-10 md:p-14">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="text-[0.72rem] font-bold uppercase tracking-[0.24em] text-gold">{ended ? "Recently" : currentEvent.kicker}</span>
              {!ended && (
                <span className="rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-gold-soft">
                  {currentEvent.badge}
                </span>
              )}
            </div>
            <H className="font-headline text-5xl font-light leading-none tracking-tight md:text-6xl">
              {currentEvent.name}
              <span className="mt-2 block italic text-gold-soft">{currentEvent.subtitle}</span>
            </H>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/75">{currentEvent.cardBlurb}</p>
            <p className="mt-4 font-headline text-lg italic text-white/60">{currentEvent.scripture}</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {meta.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-white/80">
                  <Icon size={17} className="shrink-0 text-gold" aria-hidden /> {text}
                </li>
              ))}
            </ul>
            {!ended && (
              <div className="mt-10 flex flex-wrap gap-3">
                <a href={currentEvent.registerUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("gold")}>
                  {currentEvent.registerLabel} <ArrowUpRight size={17} aria-hidden />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                {currentEvent.learnMoreUrl && (
                  <a href={currentEvent.learnMoreUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost-light")}>
                    Learn More<span className="sr-only"> about {currentEvent.name} (opens in a new tab)</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    </Reveal>
  );
}
