import Image from "next/image";
import { BookOpen, Music, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";
import { buttonClass } from "@/components/ui/Button";
import { AUTHOR_PAGE, BOOKS, MUSIC, type Book } from "@/lib/resources";

function Cover({ book }: { book: Book }) {
  if (book.cover) {
    return (
      <Image
        src={book.cover.src}
        alt={`${book.title} — cover`}
        width={book.cover.width}
        height={book.cover.height}
        className="h-auto w-full rounded-2xl shadow-[0_30px_60px_-30px_rgba(27,20,36,0.6)]"
      />
    );
  }
  // Typographic cover until the real artwork file is added.
  return (
    <div aria-hidden className="hero-aura relative flex aspect-[2/3] flex-col justify-between overflow-hidden rounded-2xl p-6 text-white shadow-[0_30px_60px_-30px_rgba(27,20,36,0.6)]">
      <span className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-gold">{book.author}</span>
      <span>
        <span className="block font-headline text-3xl font-light leading-none">{book.title}</span>
        {book.subtitle && <span className="mt-3 block font-headline text-sm italic text-gold-soft">{book.subtitle}</span>}
      </span>
    </div>
  );
}

function External({ href, children, variant = "dark" }: { href: string; children: React.ReactNode; variant?: "dark" | "ghost-dark" }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass(variant, "md")}>
      {children} <ArrowUpRight size={15} aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export default function ResourcesPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <PageHero
          eyebrow="Resources"
          title={<>Books & <em className="text-gold-soft">Music</em></>}
          intro="Writing and worship from Pastor Amos Unogwu — to carry the Word with you through the week."
        />

        <Section tone="ivory" aria-labelledby="books-title">
          <SectionHeader id="books-title" eyebrow="Books" title="Read" />
          <ul className="space-y-10">
            {BOOKS.map((b, i) => (
              <Reveal as="li" key={b.title} delay={i * 0.07}>
                <article className="grid gap-8 rounded-[2rem] border border-line bg-white p-7 md:grid-cols-[220px_1fr] md:p-10">
                  <div className="mx-auto w-44 md:w-full">
                    <Cover book={b} />
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
                      <BookOpen size={14} aria-hidden /> {[b.formats, b.published].filter(Boolean).join(" · ")}
                    </p>
                    <h3 className="mt-2 font-headline text-3xl text-text md:text-4xl">{b.title}</h3>
                    {b.subtitle && <p className="mt-1 font-headline text-lg italic text-muted">{b.subtitle}</p>}
                    <p className="mt-1 text-sm text-muted">by {b.author}</p>
                    {b.description && <p className="mt-5 max-w-2xl leading-relaxed text-text">{b.description}</p>}
                    <div className="mt-7 flex flex-wrap gap-3">
                      {b.links.map((l) => (
                        <External key={l.href} href={l.href}>{l.label}</External>
                      ))}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </ul>
          <p className="mt-8 text-sm">
            <a href={AUTHOR_PAGE.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-plum hover:text-gold-deep">
              {AUTHOR_PAGE.label} <ArrowUpRight size={14} aria-hidden />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </Section>

        <Section tone="parchment" aria-labelledby="music-title">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.2fr]">
            <Reveal>
              <SectionHeader
                id="music-title"
                eyebrow="Music"
                title={<>Listen to <em className="text-gold-deep">{MUSIC.artist}</em></>}
                intro={MUSIC.blurb}
                className="mb-0 md:mb-0"
              />
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-[2rem] border border-line bg-white p-7 md:p-10">
                <p className="flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-gold-deep">
                  <Music size={14} aria-hidden /> Singles
                </p>
                <ul className="mt-4 divide-y divide-line">
                  {MUSIC.releases.map((r) => (
                    <li key={r} className="py-3 font-headline text-xl text-text">{r}</li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-wrap gap-3">
                  {MUSIC.links.map((l, i) => (
                    <External key={l.href} href={l.href} variant={i === 0 ? "dark" : "ghost-dark"}>{l.label}</External>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}
