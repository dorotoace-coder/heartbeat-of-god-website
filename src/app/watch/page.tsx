import { Youtube, Video, Radio, CalendarClock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Eyebrow } from "@/components/ui/Section";
import { buttonClass } from "@/components/ui/Button";
import { SERVICE_TIMES, SOCIALS, YOUTUBE_LIVE_EMBED, ZOOM_REGISTER_URL } from "@/lib/site";

export default function WatchPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="hero-aura min-h-screen px-5 pb-24 pt-32 text-white sm:px-8 md:pt-40">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow tone="dark" className="justify-center">
              <span className="relative mr-1 inline-flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              HBG TV · Live Stream
            </Eyebrow>
            <h1 className="font-headline text-5xl font-light leading-tight md:text-7xl">
              Atmosphere of <em className="text-gold-soft">Glory</em>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/70">
              Join us live every <strong className="text-white">Sunday at 9:00 AM</strong> and <strong className="text-white">Wednesday at 6:00 PM</strong>.
              Outside service times the player may show that the stream is offline — our past messages are always on the channel.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-[1.75rem] border border-white/10 bg-black shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)]">
            <div className="relative aspect-video">
              <iframe
                className="absolute inset-0 h-full w-full"
                src={YOUTUBE_LIVE_EMBED}
                title="HBG TV — Heartbeat of God live stream on YouTube"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={SOCIALS.youtubeLive} target="_blank" rel="noopener noreferrer" className={buttonClass("gold")}>
              <Youtube size={18} aria-hidden /> Watch on YouTube<span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a href={ZOOM_REGISTER_URL} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost-light")}>
              <Video size={18} aria-hidden /> Join on Zoom<span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a href={SOCIALS.youtube} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost-light")}>
              <Radio size={18} aria-hidden /> Subscribe to @HBG_tv<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>

          <section aria-labelledby="times-title" className="mt-20">
            <h2 id="times-title" className="mb-6 flex items-center justify-center gap-2 text-center text-xs font-bold uppercase tracking-[0.24em] text-gold">
              <CalendarClock size={16} aria-hidden /> Service Times
            </h2>
            <ul className="grid gap-4 md:grid-cols-3">
              {SERVICE_TIMES.map((s) => (
                <li key={s.name} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
                  <p className="font-headline text-2xl">{s.name}</p>
                  <p className="mt-2 text-gold-soft">{s.day} · {s.time}</p>
                  <p className="mt-2 text-sm text-white/60">{s.note}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
