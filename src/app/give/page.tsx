import { CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/site/PageHero";
import GiveClient from "@/components/give/GiveClient";
import { getGivingConfig, NGN_BANK_DETAILS } from "@/lib/giving";
import { currentEvent } from "@/config/currentEvent";

export default function GivePage() {
  const config = getGivingConfig();
  const cardProviders = [
    (config.stripeCheckout || config.stripeLink) && "Stripe (CAD/USD)",
    (config.paystackKey || config.paystackPage) && "Paystack (NGN)",
  ].filter((x): x is string => Boolean(x));
  const reasons = [
    { title: "Global Outreach", body: "Funding crusades, media broadcasts, and international missions." },
    { title: "Feed the Future", body: "Feeding vulnerable families monthly with dignity, structure, and follow-up." },
    { title: currentEvent.name, body: `Supporting ${currentEvent.subtitle} — ${currentEvent.dateLabel}, ${currentEvent.venue}.` },
  ];

  return (
    <>
      <Navbar />
      <main id="main-content">
        <PageHero
          eyebrow="Kingdom Partnership"
          title={<>Sow into the <em className="text-gold-soft">Movement</em></>}
          intro="Your giving enables us to take the message of God’s presence to the ends of the earth. Thank you for partnering with the heartbeat of God."
        />
        <section className="relative z-10 bg-ivory px-5 pb-24 sm:px-8">
          <div className="relative mx-auto -mt-12 grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.15fr]">
            <div className="order-2 pt-4 lg:order-1 lg:pt-20">
              <h2 className="font-headline text-3xl text-text">What your seed carries</h2>
              <ul className="mt-8 space-y-6">
                {reasons.map((r) => (
                  <li key={r.title} className="flex gap-4">
                    <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-gold-deep" aria-hidden />
                    <div>
                      <h3 className="font-semibold text-text">{r.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{r.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {cardProviders.length > 0 && (
                <p className="mt-10 border-t border-line pt-6 text-sm leading-relaxed text-muted">
                  Card payments are processed securely by {cardProviders.join(" and ")}. Heartbeat of God never sees or stores your card details.
                </p>
              )}
            </div>
            <div className="order-1 lg:order-2">
              <GiveClient config={config} bank={NGN_BANK_DETAILS} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
