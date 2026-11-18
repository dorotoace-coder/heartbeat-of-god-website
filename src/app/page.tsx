import Image from "next/image";
import Link from "next/link";
import { ArrowRight, HandHeart, Users, Radio, Youtube, CalendarClock, BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/home/Hero";
import VlogSection from "@/components/VlogSection";
import FeaturedEvent from "@/components/site/FeaturedEvent";
import UpcomingEvents from "@/components/site/UpcomingEvents";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeader, Eyebrow } from "@/components/ui/Section";
import { buttonClass } from "@/components/ui/Button";
import LatestVideos from "@/components/site/LatestVideos";
import FollowHBG from "@/components/site/FollowHBG";
import JsonLd from "@/components/site/JsonLd";
import { verseForDate } from "@/lib/scripture";
import { getUpcomingEvents } from "@/lib/data";
import { getTodaysDailyWord } from "@/lib/dailyWordData";
import { excerpt, translationOf } from "@/lib/dailyWord";
import { DESCRIPTION, FOUNDER, HQ_ADDRESS, MINISTRY_EMAIL, SITE_NAME, SITE_URL, SOCIALS } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

// Re-render hourly so the Word of the Day and upcoming events stay current.
export const revalidate = 3600;

export const metadata = {
  ...pageMetadata({
    title: "Home",
    socialTitle: "Heartbeat of God Ministry — Bringing Men to the Consciousness of God’s Presence",
    description:
      "Heartbeat of God Ministry — bringing men to the consciousness of God’s presence. Sunday Celebration 9:00 AM, Wednesday live 6:00 PM, Night of Prayer on the third Friday of each quarter, 10:00 PM.",
    path: "/",
  }),
  title: { absolute: "Heartbeat of God | Bringing Men to the Consciousness of God’s Presence" },
};

const pathways = [
  { href: "/give", Icon: HandHeart, title: "Giving", body: "Partner with us in spreading the word across nations." },
  { href: "/departments", Icon: Users, title: "Join a Department", body: "Discover your purpose by serving in our diverse teams." },
  { href: "/watch", Icon: Radio, title: "Watch Live", body: "Join our services online and feel the atmosphere of glory." },
];

export default async function Home() {
  const [events, daily] = await Promise.all([getUpcomingEvents(3), getTodaysDailyWord()]);
  // Today's published Daily Word wins; otherwise the local KJV rotation.
  const local = verseForDate();
  const verse = daily ? { text: daily.scripture_text, reference: daily.scripture_ref } : local;
  const translation = translationOf(verse.reference);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Church",
          "@id": `${SITE_URL}/#church`,
          name: SITE_NAME,
          alternateName: ["Heartbeat of God", "HBG"],
          url: SITE_URL,
          logo: `${SITE_URL}/hbg-logo.png`,
          image: `${SITE_URL}/pastor-amos-pro.jpg`,
          description: DESCRIPTION,
          email: MINISTRY_EMAIL,
          founder: { "@type": "Person", name: FOUNDER },
          address: {
            "@type": "PostalAddress",
            streetAddress: HQ_ADDRESS[0],
            addressLocality: "Akute",
            addressRegion: "Ogun State",
            addressCountry: "NG",
          },
          sameAs: [SOCIALS.youtube, SOCIALS.instagram, SOCIALS.tiktok],
        }}
      />
      <Navbar />
      <main id="main-content">
        <Hero />

        {/* Current headline programme */}
        <Section tone="ink" className="pt-4 md:pt-8" aria-labelledby="featured-event">
          <h2 id="featured-event" className="sr-only">Next gathering</h2>
          <FeaturedEvent />
        </Section>

        {/* Word of the Day — today's published Daily Word, else the local KJV rotation */}
        <Section tone="ivory" aria-labelledby="word-title">
          <div className="grid items-center gap-12 lg:grid-cols-[1.3fr_1fr]">
            <Reveal>
              <figure className="relative">
                <Eyebrow>Word of the Day</Eyebrow>
                <h2 id="word-title" className="sr-only">Word of the Day — {verse.reference}</h2>
                <blockquote className="font-headline text-balance text-3xl font-light leading-[1.25] text-text md:text-[2.6rem]">
                  <span aria-hidden className="mr-1 text-gold">“</span>
                  {verse.text}
                  <span aria-hidden className="text-gold">”</span>
                </blockquote>
                <figcaption className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-gold-deep">
                  {translation.ref} <span className="font-medium normal-case tracking-normal text-muted">· {translation.long}</span>
                </figcaption>
                {daily ? (
                  <div className="mt-8 border-t border-line pt-6">
                    <p className="font-headline text-2xl text-text">{daily.title}</p>
                    {daily.devotional && <p className="mt-2 max-w-xl leading-relaxed text-muted">{excerpt(daily.devotional, 170)}</p>}
                    <Link href={`/daily-word/${daily.slug}`} className="group mt-4 inline-flex items-center gap-2 text-sm font-semibold text-plum">
                      Read today’s Daily Word <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
                    </Link>
                  </div>
                ) : (
                  <Link href="/daily-word" className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-plum">
                    Explore the Daily Word <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
                  </Link>
                )}
              </figure>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-3xl border border-line bg-white p-8 md:p-10">
                <BookOpen size={26} className="text-gold-deep" aria-hidden />
                <h3 className="mt-5 font-headline text-3xl text-text">Engage with the Living Word</h3>
                <p className="mt-4 leading-relaxed text-muted">
                  Every message is a conduit for transformation. Explore our library of teachings designed to awaken the spirit of man to the divine reality.
                </p>
                <ul className="mt-6 space-y-3 text-sm">
                  <li><strong className="text-text">Biblical Authority</strong> <span className="text-muted">— rooted in the uncompromised word of God.</span></li>
                  <li><strong className="text-text">Spiritual Depth</strong> <span className="text-muted">— exploring the mysteries of the Kingdom.</span></li>
                </ul>
                <Link href="/media" className={buttonClass("dark", "md", "mt-8")}>
                  Browse Media Archive <ArrowRight size={16} aria-hidden />
                </Link>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* Pathways */}
        <Section tone="parchment" aria-labelledby="pathways-title">
          <SectionHeader id="pathways-title" eyebrow="Find Your Place" title={<>Worship. Serve. <em className="text-gold-deep">Give.</em></>} />
          <ul className="grid gap-5 md:grid-cols-3">
            {pathways.map(({ href, Icon, title, body }, i) => (
              <Reveal as="li" key={href} delay={i * 0.08}>
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-3xl border border-line bg-white p-8 transition hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_30px_60px_-35px_rgba(27,20,36,0.45)]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-plum text-gold-soft">
                    <Icon size={22} aria-hidden />
                  </span>
                  <h3 className="mt-8 font-headline text-2xl text-text">{title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{body}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-plum">
                    Continue <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </Section>

        <VlogSection />

        <LatestVideos tone="ivory" />

        {/* Heart Beat Television */}
        <Section tone="dark" className="overflow-hidden" aria-labelledby="hbtv-title">
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-full bg-lilac/10 blur-[120px]" />
          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink via-plum-soft to-ink">
                <div aria-hidden className="absolute inset-0 grain opacity-70" />
                <div aria-hidden className="absolute inset-6 rounded-2xl border border-white/10" />
                <div className="relative text-center">
                  <Image src="/hbg-logo.png" alt="" width={140} height={115} className="mx-auto h-24 w-auto" />
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-white/60">HBG TV · @HBG_tv</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <Eyebrow tone="dark">Broadcasting Live</Eyebrow>
              <h2 id="hbtv-title" className="font-headline text-4xl font-light leading-tight md:text-6xl">
                Heart Beat <em className="text-gold-soft">Television</em>
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70">
                Experience the message of the Kingdom. Tune in to our channel for uplifting music, revelatory teachings, and live encounters from across the world.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/watch" className={buttonClass("gold")}>
                  <Radio size={17} aria-hidden /> Watch Channel Now
                </Link>
                <a href={SOCIALS.youtube} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost-light")}>
                  <Youtube size={17} aria-hidden /> Subscribe on YouTube<span className="sr-only"> (opens in a new tab)</span>
                </a>
                <Link href="/programs" className={buttonClass("ghost-light")}>
                  <CalendarClock size={17} aria-hidden /> Service Times
                </Link>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* Feed the Future teaser */}
        <Section tone="ivory" aria-labelledby="ftf-title">
          <Reveal>
            <div className="grid gap-10 rounded-[2rem] border border-line bg-white p-8 md:grid-cols-[1fr_auto] md:items-end md:p-14">
              <div>
                <Eyebrow>Community Project</Eyebrow>
                <h2 id="ftf-title" className="font-headline text-4xl font-light leading-tight text-text md:text-5xl">
                  Feed the <em className="text-gold-deep">Future</em>
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
                  We feed vulnerable families monthly — with dignity and structure. Not charity handed out and forgotten, but a full system of registration, distribution, documentation, and follow-up. Partner with us for real community impact.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/feed-the-future" className={buttonClass("dark")}>Explore the Project</Link>
                <Link href="/connect?type=Partnership%20Inquiry" className={buttonClass("ghost-dark")}>Become a Partner</Link>
              </div>
            </div>
          </Reveal>
        </Section>

        {/* Upcoming encounters */}
        <Section tone="parchment" aria-labelledby="upcoming-title">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeader id="upcoming-title" eyebrow="Don’t Miss Out" title="Upcoming Encounters" className="mb-0 md:mb-0" />
            <Link href="/programs" className="group mb-12 inline-flex items-center gap-2 text-sm font-semibold text-plum md:mb-16">
              View Calendar <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
          <UpcomingEvents events={events} />
        </Section>

        {/* Follow HBG */}
        <Section tone="ivory" aria-labelledby="follow-title">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.6fr]">
            <Reveal>
              <Eyebrow>Stay Connected</Eyebrow>
              <h2 id="follow-title" className="font-headline text-4xl font-light leading-tight text-text md:text-5xl">
                Follow <em className="text-gold-deep">HBG</em>
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted">
                Teachings, the Daily Word, worship and live encounters — wherever you already are.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <FollowHBG />
            </Reveal>
          </div>
        </Section>

        {/* Closing scripture */}
        <section aria-label="Scripture" className="hero-aura relative overflow-hidden px-5 py-28 text-center text-white sm:px-8 md:py-36">
          <Reveal className="relative mx-auto max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-gold">Psalm 46:10</p>
            <p className="mt-8 font-headline text-balance text-4xl font-light leading-tight md:text-6xl">
              “Be still, and <em className="text-gold-soft">know</em> that I am God.”
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              <Link href="/connect?type=First-Timer%20Card" className={buttonClass("gold")}>Plan Your First Visit</Link>
              <Link href="/connect?type=Prayer%20Request" className={buttonClass("ghost-light")}>Send a Prayer Request</Link>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
