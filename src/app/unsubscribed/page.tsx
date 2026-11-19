import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/site/PageHero";
import { ButtonLink } from "@/components/ui/Button";
import { MINISTRY_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Unsubscribed",
  robots: { index: false, follow: false },
};

type SP = Promise<{ status?: string }>;

export default async function UnsubscribedPage({ searchParams }: { searchParams: SP }) {
  const { status } = await searchParams;
  const unknown = status === "unknown";
  return (
    <>
      <Navbar />
      <main id="main-content">
        <PageHero
          eyebrow="Newsletter"
          title={unknown ? "We couldn’t find that subscription" : "You’re unsubscribed"}
          intro={
            unknown ? (
              <>The link may have expired or already been used. To be removed by hand, email <a className="text-gold-soft underline underline-offset-2" href={`mailto:${MINISTRY_EMAIL}?subject=Unsubscribe`}>{MINISTRY_EMAIL}</a>.</>
            ) : (
              "You won’t receive Heartbeat of God emails any more. The Daily Word is always here whenever you want it."
            )
          }
        >
          <ButtonLink href="/daily-word" variant="gold">Read the Daily Word</ButtonLink>
          <ButtonLink href="/" variant="ghost-light">Back to home</ButtonLink>
        </PageHero>
      </main>
      <Footer />
    </>
  );
}
