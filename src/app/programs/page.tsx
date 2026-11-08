import Link from "next/link";
import { Clock, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/site/PageHero";
import FeaturedEvent from "@/components/site/FeaturedEvent";
import UpcomingEvents from "@/components/site/UpcomingEvents";
import Countdown from "@/components/programs/Countdown";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { buttonClass } from "@/components/ui/Button";
import { currentEvent, hasEnded } from "@/config/currentEvent";
import { getUpcomingEvents } from "@/lib/data";
import { cn } from "@/lib/cn";
import { isPastDay } from "@/lib/format";

export const revalidate = 3600;

/** currentEvent times are local to the venue (Akute, Nigeria — WAT, UTC+1). */
function withVenueOffset(iso: string) {
  return /([+-]\d\d:\d\d|Z)$/.test(iso) ? iso : `${iso}+01:00`;
}

const CORE_PROGRAMS = [
  { name: "Evangelism and Outreach", time: "Quarterly", desc: "Our primary engine for soul-winning and global mission impact." },
  { name: "CLT Devotionals", time: "Daily / Weekly", desc: "Small group spiritual nourishment and intimate Word study." },
  { name: "Prayer & Fasting Seasons", time: "Monthly", desc: "Consecrated windows for seeking God’s face and corporate breakthrough." },
  { name: "Mentorship Services", time: "By Appointment", desc: "One-on-one spiritual guidance and personalized life coaching." },
  { name: "Revival Gatherings", time: "Special Scheduled", desc: "High-intensity atmosphere of worship and prophetic demonstration." },
  { name: "Leadership Development", time: "Monthly", desc: "Training the next generation of Kingdom-focused administrators." },
  { name: "Discipleship Meetings", time: "Weekly", desc: "Deep-dives into the doctrine of Christ and spiritual maturity." },
  { name: "Spiritual Training", time: "Enrollment Based", desc: "Certificated courses covering biblical foundations and ministry." },
];

/** `ends` is the last day of each item (2026), used only to mark past entries. */
const ANNUAL_CALENDAR = [
  { months: "Jan 1 – Feb 1", ends: "2026-02-01", focus: "STIR UP — Prayer & Fasting", details: "Month-long consecration, fasting and alignment to begin the year in God." },
  { months: "Feb 1", ends: "2026-02-01", focus: "First Fruit Sunday", details: "Thanksgiving and seed sowing — honouring God with the first of everything." },
  { months: "Mar 29–30", ends: "2026-03-30", focus: "Salvation Challenge Conference", details: "Leadership prayer, intercession and major soul-winning initiative." },
  { months: "Apr 3", ends: "2026-04-03", focus: "RISEN Crusade", details: "Easter Friday crusade — integrated departmental execution and outreach." },
  { months: "Jun 5–7", ends: "2026-06-07", focus: "ILPC 2026 — Mid-Year Conference", details: "International Leaders & Pastors Conference. Volunteer training and evaluation." },
  { months: "Aug 13 – Sep 2", ends: "2026-09-02", focus: "We Wait — 21 Days Fasting & Prayer", details: "Spiritual focus, intercession and fasting emphasis leading into MTA26." },
  { months: "Sep 4–6", ends: "2026-09-06", focus: "MTA26 — Mighty Turn Around Assembly", details: "Full programme integration. Our major annual gathering of fire and power." },
  { months: "Nov 27", ends: "2026-11-27", focus: "TRIBE X CONCERT — Throne Room", details: "A night of worship and prophecy. Come before the throne of God." },
  { months: "Dec 9", ends: "2026-12-09", focus: "Christmas Carol", details: "Community outreach and celebration of the birth of Christ." },
  { months: "Dec 31", ends: "2026-12-31", focus: "Captured in Glory Night", details: "Year-end celebration — entering the new year in God’s glory." },
];

export default async function ProgramsPage() {
  const events = await getUpcomingEvents(3);
  const ended = hasEnded();

  return (
    <>
      <Navbar />
      <main id="main-content">
        <PageHero
          eyebrow="Programs & Calendar"
          title={<>A Rhythm of <em className="text-gold-soft">Encounter</em></>}
          intro="Explore our consistent patterns of spiritual engagement designed to keep your focus on the Kingdom — and the gatherings that mark our year."
          aside={!ended ? <Countdown to={withVenueOffset(currentEvent.startsAt)} label={`${currentEvent.name} begins in`} /> : undefined}
        />

        <Section tone="ink" className="pt-4 md:pt-8" aria-labelledby="flagship">
          <h2 id="flagship" className="sr-only">Flagship event</h2>
          <FeaturedEvent />
        </Section>

        <Section tone="ivory" aria-labelledby="upcoming-title">
          <SectionHeader id="upcoming-title" eyebrow="Coming Up" title="Upcoming Encounters" />
          <UpcomingEvents events={events} />
        </Section>

        <Section tone="parchment" aria-labelledby="rhythm-title">
          <SectionHeader id="rhythm-title" eyebrow="Ministry Rhythm" title="Our Core Programs" />
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CORE_PROGRAMS.map((p, i) => (
              <Reveal as="li" key={p.name} delay={(i % 4) * 0.06}>
                <div className="flex h-full flex-col rounded-3xl border border-line bg-white p-7">
                  <h3 className="font-headline text-2xl leading-snug text-text">{p.name}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{p.desc}</p>
                  <p className="mt-auto flex items-center gap-2 pt-6 text-xs font-bold uppercase tracking-[0.16em] text-gold-deep">
                    <Clock size={14} aria-hidden /> {p.time}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Section>

        <Section tone="ivory" aria-labelledby="calendar-title">
          <SectionHeader id="calendar-title" eyebrow="2026" title="Annual Ministry Calendar" />
          <ol className="relative space-y-3 border-l border-line pl-6 md:pl-10">
            {ANNUAL_CALENDAR.map((c) => {
              const past = isPastDay(c.ends);
              return (
                <li key={c.focus} className={cn("relative rounded-2xl border bg-white p-6 md:grid md:grid-cols-[10rem_1fr_1.1fr] md:items-center md:gap-8", past ? "border-line opacity-70" : "border-gold/40")}>
                  <span aria-hidden className={cn("absolute -left-[31px] top-7 h-3 w-3 rounded-full border-2 md:-left-[47px]", past ? "border-line bg-ivory" : "border-gold bg-gold")} />
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-gold-deep">{c.months}</p>
                  <h3 className="mt-1 font-headline text-2xl text-text md:mt-0">
                    {c.focus}
                    {past && (
                      <span className="ml-2 inline-flex items-center gap-1 align-middle text-[0.65rem] font-bold uppercase tracking-wider text-muted">
                        <Check size={12} aria-hidden /> Past
                      </span>
                    )}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted md:mt-0">{c.details}</p>
                </li>
              );
            })}
          </ol>
          <div className="mt-14 rounded-3xl border border-line bg-parchment p-8 text-center md:p-12">
            <h3 className="font-headline text-3xl text-text">Need the detailed schedule?</h3>
            <p className="mx-auto mt-3 max-w-xl text-muted">Ask us about any programme — dates, venues, registration or how to take part — and our team will get back to you.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={`/connect?type=${encodeURIComponent("Event Registration")}`} className={buttonClass("dark")}>Ask About a Programme</Link>
              <Link href="/watch" className={buttonClass("ghost-dark")}>Watch Services Live</Link>
            </div>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
