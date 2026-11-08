import Image from "next/image";
import Link from "next/link";
import { HeartHandshake, BookOpen, Send } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeader, Eyebrow } from "@/components/ui/Section";
import { buttonClass } from "@/components/ui/Button";

const MODEL = [
  { title: "Win", Icon: HeartHandshake, desc: "Bringing people to Christ through evangelism, outreach, and the preaching of the Gospel." },
  { title: "Build", Icon: BookOpen, desc: "Nurturing believers through the Word of God, prayer, fellowship, discipleship, and spiritual development." },
  { title: "Send", Icon: Send, desc: "Releasing believers to influence communities and the world through service, leadership, and Kingdom impact." },
];

const FOUNDATION = [
  "The Lordship of Jesus Christ",
  "Transforming Power of the Holy Spirit",
  "Authority of Scripture",
  "Prayer",
  "Discipleship",
  "Evangelism",
  "Christian Growth & Maturity",
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <PageHero eyebrow="Our Identity" title="Heartbeat of God Ministry" intro={<em className="font-headline text-2xl text-white/80 md:text-3xl">“A Reason to Live”</em>} />

        <Section tone="ivory" aria-labelledby="vision-title">
          <div className="grid items-center gap-14 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>Our Vision</Eyebrow>
              <h2 id="vision-title" className="font-headline text-balance text-4xl font-light leading-tight text-text md:text-5xl">
                To bring men to the sense of God’s divine presence.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted">
                We exist to help people encounter Christ, grow spiritually, and influence the world through the power of the Holy Spirit.
              </p>
              <div className="mt-10 border-t border-line pt-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Founder &amp; Lead Pastor</p>
                <p className="mt-2 font-headline text-3xl text-text">Pastor Amos Unogwu</p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <figure className="relative overflow-hidden rounded-[2rem] bg-ink shadow-[0_40px_90px_-40px_rgba(14,7,22,0.8)]">
                <div className="relative aspect-[4/5] sm:aspect-[3/2] lg:aspect-[4/5]">
                  <Image
                    src="/pastor-amos-pro.jpg"
                    alt="Pastor Amos Unogwu, Founder and Lead Pastor of Heartbeat of God Ministry"
                    fill
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    className="object-cover object-[65%_center]"
                  />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-transparent" />
                </div>
                <figcaption className="absolute bottom-8 left-8 text-white">
                  <span className="block font-headline text-3xl">Pst. Amos Unogwu</span>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold-soft">Leading the Vision</span>
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </Section>

        <Section tone="parchment" aria-labelledby="model-title">
          <SectionHeader id="model-title" align="center" eyebrow="The Mission Model" title={<>Win <span className="text-gold-deep">•</span> Build <span className="text-gold-deep">•</span> Send</>} />
          <ol className="grid gap-6 md:grid-cols-3">
            {MODEL.map(({ title, Icon, desc }, i) => (
              <Reveal as="li" key={title} delay={i * 0.08}>
                <div className="h-full rounded-3xl border border-line bg-white p-9">
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-plum text-gold-soft"><Icon size={22} aria-hidden /></span>
                    <span className="font-headline text-5xl font-light text-line">{i + 1}</span>
                  </div>
                  <h3 className="mt-8 font-headline text-3xl uppercase tracking-wide text-text">{title}</h3>
                  <p className="mt-3 leading-relaxed text-muted">{desc}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </Section>

        <section aria-labelledby="foundation-title" className="hero-aura px-5 py-24 text-white sm:px-8 md:py-32">
          <div className="mx-auto max-w-5xl text-center">
            <Eyebrow tone="dark" className="justify-center">What We Stand On</Eyebrow>
            <h2 id="foundation-title" className="font-headline text-4xl font-light md:text-5xl">Spiritual Foundation</h2>
            <ul className="mt-12 flex flex-wrap justify-center gap-3">
              {FOUNDATION.map((item) => (
                <li key={item} className="rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-base text-white/90">{item}</li>
              ))}
            </ul>
            <p className="mx-auto mt-14 max-w-3xl font-headline text-xl italic leading-relaxed text-white/75 md:text-2xl">
              “We believe that the Holy Spirit reveals truth, empowers believers, produces transformation, enables Christian witness, and leads believers into spiritual maturity.”
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-3">
              <Link href="/departments" className={buttonClass("gold")}>Join the Movement</Link>
              <Link href="/connect" className={buttonClass("ghost-light")}>Connect With Us</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
