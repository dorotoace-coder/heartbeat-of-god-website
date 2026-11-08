import Image from "next/image";
import { Clock, MapPin, ArrowUpRight, CalendarDays } from "lucide-react";
import type { EventRow } from "@/lib/data";
import { formatEventDate } from "@/lib/format";
import { SERVICE_TIMES } from "@/lib/site";
import { currentEvent, hasEnded } from "@/config/currentEvent";
import Reveal from "@/components/ui/Reveal";

type CardData = {
  key: string;
  badge: string;
  title: string;
  body: string;
  when: string;
  where?: string;
  image?: string | null;
  href?: string | null;
};

function fromRow(e: EventRow): CardData {
  const d = formatEventDate(e.event_date);
  return {
    key: e.id,
    badge: d.short,
    title: e.name,
    body: e.description ?? "",
    when: `${d.full} · ${d.time}`,
    where: e.location ?? undefined,
    image: e.image_url,
    href: e.registration_link,
  };
}

/** Real fallback built from the published weekly rhythm + the current headline event. */
function fallbackCards(): CardData[] {
  const cards: CardData[] = [];
  if (!hasEnded()) {
    cards.push({
      key: "current",
      badge: currentEvent.dateLabel,
      title: `${currentEvent.name} — ${currentEvent.subtitle}`,
      body: currentEvent.cardBlurb,
      when: currentEvent.dateLabel,
      where: currentEvent.venue,
      image: currentEvent.flyer,
      href: currentEvent.registerUrl,
    });
  }
  const sunday = SERVICE_TIMES[0];
  const prayer = SERVICE_TIMES[2];
  cards.push(
    { key: "sunday", badge: "Weekly", title: sunday.name, body: "Praise, worship, and the Word — every Sunday.", when: `${sunday.day} · ${sunday.time}`, image: "/salvation.jpg" },
    { key: "prayer", badge: "Weekly", title: prayer.name, body: "All-night intercession and encounter with God.", when: `${prayer.day} · ${prayer.time}` },
  );
  return cards;
}

/** Only allow images we can render safely: local files or https URLs. */
function safeImage(src?: string | null) {
  if (!src) return null;
  return src.startsWith("/") || src.startsWith("https://") ? src : null;
}

export default function UpcomingEvents({ events }: { events: EventRow[] }) {
  const cards = events.length > 0 ? events.slice(0, 3).map(fromRow) : fallbackCards();

  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((c, i) => {
        const img = safeImage(c.image);
        return (
          <Reveal as="li" key={c.key} delay={i * 0.08} className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-[0_20px_50px_-30px_rgba(27,20,36,0.3)] transition hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(27,20,36,0.4)]">
            <div className="relative h-52 overflow-hidden bg-gradient-to-br from-plum to-ink">
              {img ? (
                <Image
                  src={img}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                  unoptimized={!img.startsWith("/")}
                  className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <CalendarDays size={44} className="text-gold/60" aria-hidden />
                </div>
              )}
              <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-wider text-ink">{c.badge}</span>
            </div>
            <div className="flex flex-1 flex-col p-7">
              <h3 className="font-headline text-2xl leading-snug text-text">{c.title}</h3>
              {c.body && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted">{c.body}</p>}
              <div className="mt-auto space-y-2 pt-6 text-sm text-muted">
                <p className="flex items-center gap-2"><Clock size={15} className="text-gold-deep" aria-hidden /> {c.when}</p>
                {c.where && <p className="flex items-center gap-2"><MapPin size={15} className="text-gold-deep" aria-hidden /> {c.where}</p>}
              </div>
              {c.href && (
                <a href={c.href} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-plum underline-offset-4 hover:underline">
                  Register <ArrowUpRight size={15} aria-hidden /><span className="sr-only"> for {c.title} (opens in a new tab)</span>
                </a>
              )}
            </div>
          </Reveal>
        );
      })}
    </ul>
  );
}
