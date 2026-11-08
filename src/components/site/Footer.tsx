import Image from "next/image";
import Link from "next/link";
import { currentEvent } from "@/config/currentEvent";
import { DESCRIPTION, MINISTRY_EMAIL, SERVICE_TIMES } from "@/lib/site";
import NewsletterForm from "./NewsletterForm";
import SocialIcons from "./SocialIcons";

const columns = [
  {
    title: "Ministry",
    links: [
      { href: "/about", label: "About HBG" },
      { href: "/programs", label: "Programs & Calendar" },
      { href: "/departments", label: "Join a Department" },
      { href: "/media", label: "Media Archive" },
      { href: "/daily-word", label: "Daily Word" },
    ],
  },
  {
    title: "Take Part",
    links: [
      { href: "/watch", label: "Watch Live" },
      { href: "/give", label: "Give" },
      { href: "/feed-the-future", label: "Feed the Future" },
      { href: "/connect", label: "Contact & Prayer" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-ink text-white">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image src="/hbg-logo.png" alt="" width={64} height={53} className="h-12 w-auto" />
            <span className="font-headline text-2xl italic">Heartbeat of God</span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">{DESCRIPTION}</p>
          <SocialIcons className="mt-7" />
        </div>

        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title} className="md:col-span-2">
            <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-gold">{c.title}</h2>
            <ul className="space-y-3">
              {c.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-sm text-white/65 transition hover:text-white">{l.label}</Link>
                </li>
              ))}
              {c.title === "Take Part" && (
                <li>
                  <a href={currentEvent.registerUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gold-soft hover:text-gold">
                    {currentEvent.name} — {currentEvent.subtitle} →
                  </a>
                </li>
              )}
            </ul>
          </nav>
        ))}

        <div className="md:col-span-4">
          <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-gold">Gather With Us</h2>
          <ul className="mb-8 space-y-2 text-sm text-white/65">
            {SERVICE_TIMES.map((s) => (
              <li key={s.name} className="flex justify-between gap-4 border-b border-white/5 pb-2">
                <span>{s.name}</span>
                <span className="whitespace-nowrap text-white/85">{s.day.replace(/s$/, "")} · {s.time}</span>
              </li>
            ))}
          </ul>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-gold">Stay Inspired</h2>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-white/45 sm:flex-row sm:px-8">
          <p>© {new Date().getFullYear()} Heartbeat of God Ministry. All rights reserved.</p>
          <a href={`mailto:${MINISTRY_EMAIL}`} className="hover:text-white">{MINISTRY_EMAIL}</a>
        </div>
      </div>
    </footer>
  );
}
