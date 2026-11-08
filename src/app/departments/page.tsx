import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { buttonClass } from "@/components/ui/Button";
import { getDepartments } from "@/lib/data";

export const revalidate = 3600;

function applyHref(dept: string) {
  return `/connect?type=${encodeURIComponent("Department Application")}&department=${encodeURIComponent(dept)}`;
}

export default async function DepartmentsPage() {
  const departments = await getDepartments();

  return (
    <>
      <Navbar />
      <main id="main-content">
        <PageHero
          eyebrow="Serve In Excellence"
          title="Join a Department"
          intro="The sanctuary requires dedicated hands. Discover where your gifts align with the grand assignment of winning, building, and sending."
        >
          <a href="#departments" className={buttonClass("gold")}>Explore Departments</a>
          <Link href={`/connect?type=${encodeURIComponent("Department Application")}`} className={buttonClass("ghost-light")}>General Service Application</Link>
        </PageHero>

        <Section tone="ivory" id="departments" aria-labelledby="dept-title">
          <SectionHeader id="dept-title" eyebrow="Our Teams" title="Where will you serve?" />
          <ul className="grid gap-6 md:grid-cols-2">
            {departments.map((d, i) => (
              <Reveal as="li" key={d.id ?? d.name} delay={(i % 2) * 0.08}>
                <article className="flex h-full flex-col rounded-3xl border border-line bg-white p-8 transition hover:border-gold/60 hover:shadow-[0_30px_60px_-35px_rgba(27,20,36,0.45)] md:p-10">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-deep">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-3 font-headline text-3xl text-text">{d.name}</h3>
                  <p className="mt-2 font-medium text-muted">{d.description}</p>
                  <dl className="mt-8 space-y-5 text-sm leading-relaxed">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-text">What we do</dt>
                      <dd className="mt-1 text-muted">{d.what_they_do}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[0.16em] text-text">Who should join</dt>
                      <dd className="mt-1 text-muted">{d.who_should_join}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto pt-8">
                    <Link href={applyHref(d.name)} className={buttonClass("dark", "md")}>
                      {d.cta_text || "Apply to Serve"} <ArrowRight size={16} aria-hidden />
                      <span className="sr-only"> — {d.name}</span>
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </ul>
        </Section>

        <Section tone="parchment" aria-labelledby="community-title">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <SectionHeader
                id="community-title"
                eyebrow="The Heart of Service"
                title="Community in Action"
                intro="Beyond tasks and responsibilities, our departments are vibrant communities of believers growing together. We are one body with many parts, all beating with the same passion: the Heartbeat of God."
                className="mb-0 md:mb-0"
              />
            </Reveal>
            <Reveal delay={0.1}>
              <ol className="space-y-4">
                {[
                  ["Choose a team", "Read what each department does and who it’s for."],
                  ["Send your application", "It goes straight to the ministry’s coordinators."],
                  ["Get connected", "A leader will reach out to welcome you and share next steps."],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-5 rounded-2xl border border-line bg-white p-6">
                    <span className="font-headline text-3xl leading-none text-gold-deep">{i + 1}</span>
                    <div>
                      <p className="font-semibold text-text">{t}</p>
                      <p className="mt-1 text-sm text-muted">{b}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </Section>

        <section className="hero-aura px-5 py-24 text-center text-white sm:px-8">
          <Reveal className="mx-auto max-w-3xl">
            <h2 className="font-headline text-4xl font-light md:text-5xl">Ready to serve the Kingdom?</h2>
            <p className="mt-6 text-lg leading-relaxed text-white/70">
              Every hand counts in the assignment of raising Christ-conscious believers. Join a department today and find your reason to live through service.
            </p>
            <Link href={`/connect?type=${encodeURIComponent("Department Application")}`} className={buttonClass("gold", "lg", "mt-10")}>
              General Service Application
            </Link>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
