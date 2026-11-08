import Link from "next/link";
import { ClipboardCheck, Utensils, Camera, HandHeart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { buttonClass } from "@/components/ui/Button";
import { getLatestFeedReport } from "@/lib/data";

export const revalidate = 3600;

const PILLARS = [
  { Icon: ClipboardCheck, title: "Registration", body: "Every family is registered with dignity — names, needs, and follow-up tracked, never anonymous." },
  { Icon: Utensils, title: "Food Distribution", body: "Monthly distribution of food to vulnerable families, run with order and structure." },
  { Icon: Camera, title: "Documentation", body: "Photos, testimonies, and records preserved for every outreach — full transparency." },
  { Icon: HandHeart, title: "Follow-Up", body: "We stay connected after the meal — care that continues beyond the moment." },
];

const PARTNER_HREF = `/connect?type=${encodeURIComponent("Partnership Inquiry")}`;

export default async function FeedTheFuturePage() {
  const report = await getLatestFeedReport();
  const stats = report
    ? [
        { label: "Families Fed", note: "Registered & served", value: report.families_fed },
        { label: "Individuals Reached", note: "Total lives touched", value: report.individuals_reached },
        { label: "Partners Involved", note: "Sponsors recognised", value: report.partners_involved },
      ].filter((s): s is { label: string; note: string; value: number } => typeof s.value === "number")
    : [];

  return (
    <>
      <Navbar />
      <main id="main-content">
        <PageHero
          eyebrow="A Community Project of HBG Ministry"
          title={<>Feed the <em className="text-gold-soft">Future</em></>}
          intro="We feed vulnerable families monthly — with dignity and structure. This is not charity handed out and forgotten; it is a system of registration, distribution, documentation, and follow-up."
        >
          <Link href={PARTNER_HREF} className={buttonClass("gold")}><HandHeart size={18} aria-hidden /> Become a Partner</Link>
          <Link href="/give" className={buttonClass("ghost-light")}>Sponsor an Outreach</Link>
        </PageHero>

        <Section tone="ivory" aria-labelledby="how-title">
          <SectionHeader id="how-title" eyebrow="Built as a System, Not a Handout" title="How Feed the Future Works" />
          <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map(({ Icon, title, body }, i) => (
              <Reveal as="li" key={title} delay={i * 0.07}>
                <div className="h-full rounded-3xl border border-line bg-white p-7">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-plum text-gold-soft"><Icon size={22} aria-hidden /></span>
                  <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-gold-deep">Step {i + 1}</p>
                  <h3 className="mt-1 font-headline text-2xl text-text">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </Section>

        <section className="hero-aura px-5 py-24 text-center text-white sm:px-8 md:py-32">
          <Reveal className="mx-auto max-w-4xl">
            <h2 className="font-headline text-balance text-3xl font-light leading-tight md:text-5xl">
              We are not asking for donations only — <em className="text-gold-soft">we are offering partnership.</em>
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-white/70">
              We invite organizations and individuals who want real community impact and visibility to support or sponsor one of our monthly outreaches. Partners receive recognition, documentation, and a monthly impact report.
            </p>
            <Link href={PARTNER_HREF} className={buttonClass("gold", "lg", "mt-10")}>
              <HandHeart size={18} aria-hidden /> Partner With Feed the Future
            </Link>
          </Reveal>
        </section>

        <Section tone="parchment" aria-labelledby="report-title">
          <SectionHeader
            id="report-title"
            align="center"
            eyebrow="Full Transparency"
            title="Every Month, a Public Impact Report"
            intro="Each cycle we publish the numbers, the testimonies, the partners recognised, and the photo & video documentation."
          />
          {stats.length > 0 && report && (
            <>
              <p className="-mt-6 mb-8 text-center text-sm font-semibold uppercase tracking-[0.2em] text-gold-deep">{report.period_label}</p>
              <ul className="grid gap-5 md:grid-cols-3">
                {stats.map((s) => (
                  <li key={s.label} className="rounded-3xl border border-line bg-white p-10 text-center">
                    <p className="font-headline text-6xl font-light text-plum">{s.value.toLocaleString()}</p>
                    <p className="mt-3 font-semibold text-text">{s.label}</p>
                    <p className="mt-1 text-sm text-muted">{s.note}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-10 text-center text-sm italic text-muted">Numbers are published at the close of each monthly outreach.</p>
        </Section>
      </main>
      <Footer />
    </>
  );
}
