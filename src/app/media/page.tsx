import { BookOpen, Film, HandHeart, Music, Mic, Flame } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/site/PageHero";
import MediaLibrary from "@/components/media/MediaLibrary";
import Reveal from "@/components/ui/Reveal";
import { Section, SectionHeader } from "@/components/ui/Section";

const STREAMS = [
  { Icon: BookOpen, title: "CLT Devotionals", label: "Daily discipleship", desc: "Daily spiritual formation that helps believers come, listen, and take heed to the Word with prayer, reflection, and action." },
  { Icon: Film, title: "Sermon Clips", label: "Message multiplication", desc: "Short, clear moments from the Word that keep the message alive beyond Sunday and reach people where they already are." },
  { Icon: HandHeart, title: "Prayer Moments", label: "Prayer momentum", desc: "Declarations, prayer charges, and STIR UP focuses that awaken faith and keep the church aligned in the Spirit." },
  { Icon: Music, title: "Worship Reels", label: "Sound and spirit", desc: "Worship and music moments that carry sound, atmosphere, and encouragement into the week." },
  { Icon: Mic, title: "Testimony Videos", label: "Witness", desc: "Stories of God’s faithfulness preserved and shared so others can believe, pray, and return with expectation." },
  { Icon: Flame, title: "Salvation Challenge", label: "Evangelism fire", desc: "Evangelism-centered media that mobilizes believers to win souls and sustain outreach momentum." },
];

export default function MediaPage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <PageHero
          eyebrow="Media Library"
          title="Digital Archive"
          intro="Explore our digital library of sermons, teachings, and spiritual resources from Pastor Amos Unogwu."
        />

        <Section tone="ivory" aria-labelledby="library-title">
          <SectionHeader id="library-title" align="center" eyebrow="Messages" title="Listen & Watch" />
          <MediaLibrary />
        </Section>

        <Section tone="parchment" aria-labelledby="travel-title">
          <SectionHeader
            id="travel-title"
            eyebrow="How We Multiply The Word"
            title="The Message Must Travel"
            intro="Every message, prayer, testimony, and worship moment is preserved and shared so more people can encounter Christ and grow in the sense of God’s divine presence."
          />
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {STREAMS.map(({ Icon, title, label, desc }, i) => (
              <Reveal as="li" key={title} delay={(i % 3) * 0.07}>
                <div className="h-full rounded-3xl border border-line bg-white p-8">
                  <Icon size={26} className="text-gold-deep" aria-hidden />
                  <p className="mt-6 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted">{label}</p>
                  <h3 className="mt-1 font-headline text-2xl text-text">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{desc}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </Section>
      </main>
      <Footer />
    </>
  );
}
