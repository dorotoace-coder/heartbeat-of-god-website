import Image from "next/image";
import { CalendarDays, MapPin, Video, Sparkles, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeader, Eyebrow } from "@/components/ui/Section";
import NotifyForm from "@/components/ilpc/NotifyForm";
import { buttonClass } from "@/components/ui/Button";
import {
  ILPC_2026,
  ILPC_2026_GALLERY,
  ILPC_2026_PROGRAMME,
  ILPC_2026_RECAP,
  ILPC_2026_SPEAKERS,
  ILPC_2027,
} from "@/lib/ilpc";

export default function IlpcPage() {
  const facts = [
    { Icon: CalendarDays, text: ILPC_2026.dateLabel },
    { Icon: MapPin, text: ILPC_2026.venueShort },
    { Icon: Video, text: ILPC_2026.alsoOnline },
    { Icon: Sparkles, text: ILPC_2026.host },
  ];

  return (
    <>
      <Navbar />
      <main id="main-content">
        <PageHero
          eyebrow="International Leaders & Pastors Conference"
          title={<>ILPC <em className="text-gold-soft">2027</em></>}
          intro="Save the date — the conference returns in June 2027. Dates will be announced here first."
        >
          <a href="#notify" className={buttonClass("gold")}>
            Notify me
          </a>
          <a href="#ilpc-2026" className={buttonClass("ghost-light")}>
            Look back at ILPC 2026
          </a>
        </PageHero>

        {/* ILPC 2027 — save the date */}
        <Section tone="ink" id="notify" aria-labelledby="notify-title">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.2fr]">
            <Reveal>
              <Eyebrow tone="dark">Save The Date</Eyebrow>
              <h2 id="notify-title" className="font-headline text-4xl font-light leading-tight md:text-5xl">
                {ILPC_2027.name}
                <span className="mt-2 block italic text-gold-soft">{ILPC_2027.dateLabel}</span>
              </h2>
              <p className="mt-6 max-w-md leading-relaxed text-white/70">
                Leave your name and email and we’ll tell you the moment the dates, venue and registration open.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-7 sm:p-10">
                <NotifyForm type={ILPC_2027.inquiryType} eventName={ILPC_2027.name} />
              </div>
            </Reveal>
          </div>
        </Section>

        {/* ILPC 2026 recap */}
        <Section tone="ivory" id="ilpc-2026" aria-labelledby="recap-title">
          <SectionHeader
            id="recap-title"
            eyebrow="Past Conference · June 2026"
            title={<>ILPC 2026 — <em className="text-gold-deep">{ILPC_2026.theme}</em></>}
            intro={ILPC_2026_RECAP || "Three days of equipping, supernatural encounter and apostolic commissioning — in Akute and on Zoom."}
          />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3 rounded-2xl border border-line bg-white p-5 text-sm text-text">
                <Icon size={18} className="mt-0.5 shrink-0 text-gold-deep" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
          <address className="mt-5 text-sm not-italic text-muted">
            Venue: {ILPC_2026.venue[0]}, {ILPC_2026.venue[1]}
          </address>
        </Section>

        {/* Speakers */}
        <Section tone="white" aria-labelledby="speakers-title">
          <SectionHeader id="speakers-title" eyebrow="Who Ministered" title="Featured Ministers" />
          <ul className="grid gap-8 md:grid-cols-3">
            {ILPC_2026_SPEAKERS.map((s, i) => (
              <Reveal as="li" key={s.name} delay={i * 0.07}>
                <figure className="overflow-hidden rounded-3xl border border-line bg-ivory">
                  <div className="relative aspect-[4/5] bg-gradient-to-br from-plum to-ink">
                    <Image
                      src={s.photo}
                      alt={s.name}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover object-top"
                    />
                  </div>
                  <figcaption className="p-6">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-gold-deep">{s.role}</p>
                    <h3 className="mt-1 font-headline text-2xl text-text">{s.name}</h3>
                    <p className="text-sm text-muted">{s.from}</p>
                    <ul className="mt-4 space-y-1.5 text-sm text-text">
                      {s.sessions.map((x) => (
                        <li key={x} className="flex gap-2">
                          <Clock size={14} className="mt-1 shrink-0 text-gold-deep" aria-hidden />
                          {x}
                        </li>
                      ))}
                    </ul>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
        </Section>

        {/* Programme as it ran */}
        <Section tone="parchment" aria-labelledby="programme-title">
          <SectionHeader id="programme-title" eyebrow="The Programme" title="Three Days in Akute" />
          <div className="grid gap-6 lg:grid-cols-3">
            {ILPC_2026_PROGRAMME.map((d, i) => (
              <Reveal key={d.day} delay={i * 0.07}>
                <div className="h-full rounded-3xl border border-line bg-white p-7">
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-gold-deep">{d.day} · {d.date}</p>
                  <h3 className="mt-1 font-headline text-2xl text-text">{d.theme}</h3>
                  <ol className="mt-5 space-y-3">
                    {d.items.map((it) => (
                      <li key={it.time + it.title} className="grid grid-cols-[4.5rem_1fr] gap-3 border-b border-line pb-3 text-sm last:border-0">
                        <span className="font-semibold text-plum">{it.time}</span>
                        <span className="text-text">
                          {it.title}
                          {it.speaker && <span className="block text-muted">{it.speaker}</span>}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </Reveal>
            ))}
          </div>
          <figure className="mx-auto mt-14 max-w-2xl text-center">
            <blockquote className="font-headline text-2xl italic leading-snug text-text">“{ILPC_2026.scripture.text}”</blockquote>
            <figcaption className="mt-3 text-xs font-bold uppercase tracking-[0.24em] text-gold-deep">{ILPC_2026.scripture.ref}</figcaption>
          </figure>
        </Section>

        {/* Gallery — hidden until real event photos are added in src/lib/ilpc.ts */}
        {ILPC_2026_GALLERY.length > 0 && (
          <Section tone="ivory" aria-labelledby="gallery-title">
            <SectionHeader id="gallery-title" eyebrow="Gallery" title="Moments from ILPC 2026" />
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {ILPC_2026_GALLERY.map((g) => (
                <li key={g.src} className="relative overflow-hidden rounded-2xl">
                  <Image src={g.src} alt={g.alt} width={g.width} height={g.height} sizes="(min-width: 768px) 33vw, 50vw" className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
          </Section>
        )}
      </main>
      <Footer />
    </>
  );
}
