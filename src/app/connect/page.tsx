import { Suspense } from "react";
import { Mail, Phone, MapPin, HeartHandshake } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageHero from "@/components/site/PageHero";
import ConnectForm from "@/components/connect/ConnectForm";
import SocialIcons from "@/components/site/SocialIcons";
import { getDepartments } from "@/lib/data";
import { CONTACT_PHONE, HQ_ADDRESS, MINISTRY_EMAIL, SERVICE_TIMES } from "@/lib/site";

export const revalidate = 3600;

export default async function ConnectPage() {
  const departments = (await getDepartments()).map((d) => d.name);

  return (
    <>
      <Navbar />
      <main id="main-content">
        <PageHero
          eyebrow="Get In Touch"
          title="Connect With Us"
          intro="Whether you have a testimony, a prayer request, or you’re ready to serve in a department, we’re here to listen and guide."
        />
        <section className="bg-ivory px-5 pb-24 sm:px-8">
          <div className="mx-auto -mt-12 grid max-w-6xl gap-8 lg:grid-cols-[1fr_1.7fr]">
            <aside className="order-2 space-y-6 lg:order-1">
              <div className="rounded-[2rem] bg-plum p-8 text-white">
                <h2 className="font-headline text-2xl">Ministry Channels</h2>
                <ul className="mt-8 space-y-6 text-sm">
                  <li className="flex gap-4">
                    <Mail size={20} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Email</p>
                      <a href={`mailto:${MINISTRY_EMAIL}`} className="mt-1 block break-all font-medium text-white hover:text-gold-soft">{MINISTRY_EMAIL}</a>
                    </div>
                  </li>
                  {CONTACT_PHONE && (
                    <li className="flex gap-4">
                      <Phone size={20} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Phone</p>
                        <a href={`tel:${CONTACT_PHONE.replace(/[^\d+]/g, "")}`} className="mt-1 block font-medium text-white hover:text-gold-soft">{CONTACT_PHONE}</a>
                      </div>
                    </li>
                  )}
                  <li className="flex gap-4">
                    <MapPin size={20} className="mt-0.5 shrink-0 text-gold" aria-hidden />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Global Headquarters</p>
                      <address className="mt-1 not-italic leading-relaxed text-white">{HQ_ADDRESS[0]}<br />{HQ_ADDRESS[1]}</address>
                    </div>
                  </li>
                </ul>
                <SocialIcons className="mt-8" />
              </div>
              <div className="rounded-[2rem] border border-line bg-white p-8">
                <h2 className="font-headline text-2xl text-text">Service Times</h2>
                <ul className="mt-5 space-y-3 text-sm">
                  {SERVICE_TIMES.map((s) => (
                    <li key={s.name} className="flex justify-between gap-4 border-b border-line pb-3 last:border-0">
                      <span className="text-text">{s.name}</span>
                      <span className="whitespace-nowrap font-semibold text-gold-deep">{s.day.replace(/s$/, "")} · {s.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <figure className="flex gap-3 px-2 text-sm italic leading-relaxed text-muted">
                <HeartHandshake size={20} className="shrink-0 text-gold-deep" aria-hidden />
                <blockquote>
                  “Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not.”
                  <cite className="mt-1 block not-italic font-semibold text-text">— Jeremiah 33:3</cite>
                </blockquote>
              </figure>
            </aside>

            <div className="order-1 rounded-[2rem] border border-line bg-white p-7 shadow-[0_40px_90px_-50px_rgba(27,20,36,0.55)] sm:p-10 lg:order-2 lg:p-12">
              <h2 className="sr-only">Send us a message</h2>
              <Suspense fallback={<div className="h-[560px] animate-pulse rounded-2xl bg-ivory" aria-label="Loading form" />}>
                <ConnectForm departments={departments} />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
