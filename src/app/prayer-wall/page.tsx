import { HandHeart, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import PrayerWallForm from "@/components/prayer-wall/PrayerWallForm";
import PrayedButton from "@/components/prayer-wall/PrayedButton";
import { getApprovedPrayerWall } from "@/lib/prayerWall";
import { cn } from "@/lib/cn";

// Newly approved entries appear within a few minutes, no redeploy needed.
export const revalidate = 300;

function when(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default async function PrayerWallPage() {
  const entries = await getApprovedPrayerWall();

  return (
    <>
      <Navbar />
      <main id="main-content">
        <PageHero
          eyebrow="Prayer Wall"
          title={<>Pray with <em className="text-gold-soft">us</em></>}
          intro="Bring your request, or tell what God has done. Our prayer team reads every one — and with your permission, we share it so the church can stand with you."
        />

        <section className="bg-ivory px-5 pb-24 sm:px-8">
          <div className="mx-auto -mt-12 grid max-w-6xl gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[2rem] border border-line bg-white p-7 shadow-[0_40px_90px_-50px_rgba(27,20,36,0.55)] sm:p-10">
              <h2 className="mb-6 font-headline text-3xl text-text">Share a request or testimony</h2>
              <PrayerWallForm />
            </div>
            <aside className="space-y-6">
              <div className="rounded-[2rem] bg-plum p-8 text-white">
                <h2 className="font-headline text-2xl">How the wall works</h2>
                <ul className="mt-6 space-y-4 text-sm leading-relaxed text-white/80">
                  <li>Your name is optional.</li>
                  <li>Every submission goes to our prayer team first.</li>
                  <li>Only entries you choose to share, and that our team approves, appear here.</li>
                  <li>Tap “I prayed” to let someone know they are not standing alone.</li>
                </ul>
              </div>
              <figure className="flex gap-3 px-2 text-sm italic leading-relaxed text-muted">
                <HandHeart size={20} className="shrink-0 text-gold-deep" aria-hidden />
                <blockquote>
                  “Confess your faults one to another, and pray one for another, that ye may be healed.”
                  <cite className="mt-1 block not-italic font-semibold text-text">— James 5:16</cite>
                </blockquote>
              </figure>
            </aside>
          </div>
        </section>

        <Section tone="parchment" aria-labelledby="wall-title">
          <SectionHeader id="wall-title" eyebrow="Standing Together" title="The Wall" />
          {entries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line bg-white/60 p-12 text-center">
              <Sparkles size={28} className="mx-auto text-gold-deep" aria-hidden />
              <p className="mt-4 font-headline text-2xl text-text">The wall is just beginning.</p>
              <p className="mx-auto mt-2 max-w-md text-muted">
                Shared prayers and testimonies will appear here once our team has prayed over them. Be the first to share.
              </p>
            </div>
          ) : (
            <ul className="columns-1 gap-6 md:columns-2 lg:columns-3">
              {entries.map((e, i) => (
                <Reveal as="li" key={e.id} delay={(i % 3) * 0.05} className="mb-6 break-inside-avoid">
                  <article className="rounded-3xl border border-line bg-white p-7">
                    <p
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.18em]",
                        e.kind === "testimony" ? "bg-gold/15 text-gold-deep" : "bg-plum/10 text-plum",
                      )}
                    >
                      {e.kind === "testimony" ? "Testimony" : "Prayer request"}
                    </p>
                    <p className="mt-4 whitespace-pre-line leading-relaxed text-text">{e.message}</p>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                      <p className="text-xs text-muted">
                        {e.name?.trim() || "Anonymous"} · {when(e.created_at)}
                      </p>
                      {e.kind === "prayer" && <PrayedButton id={e.id} initial={e.prayed_count ?? 0} />}
                    </div>
                  </article>
                </Reveal>
              ))}
            </ul>
          )}
        </Section>
      </main>
      <Footer />
    </>
  );
}
