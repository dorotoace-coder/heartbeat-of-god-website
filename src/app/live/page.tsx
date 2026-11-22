import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { buttonClass } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live Church" };

export default async function LivePage() {
  const { data, error } = await supabase.rpc("public_live_meeting");
  const status = !error && data && ["active", "upcoming", "inactive"].includes(data.status) ? data.status : "inactive";
  return <><Navbar /><main id="main-content" className="hero-aura min-h-screen px-5 pb-24 pt-40 text-white">
    <section className="mx-auto max-w-3xl text-center">
      <p className="text-sm uppercase tracking-widest text-white/70">HBG Live Church</p>
      <h1 className="mt-4 font-headline text-5xl">Sunday service</h1>
      <p className="mt-6 text-xl" role="status">{status === "active" ? "Joining is open" : status === "upcoming" ? "Upcoming service" : "Joining is currently closed"}</p>
      {status === "active" ? <a href="/live/join" target="_blank" rel="noopener noreferrer" className={buttonClass("gold", "lg", "mt-8")}>
        JOIN LIVE SERVICE<span className="sr-only"> (opens Zoom in a new tab)</span>
      </a> : <p className="mt-8 text-white/75">{status === "upcoming" ? "Please return here when joining opens." : "Please check back for our next service."}</p>}
      <p className="mt-6 text-sm text-white/60">Joining availability is managed by the church. It does not confirm that a Zoom meeting has started.</p>
      <a href="/watch" className="mt-8 inline-block underline">Watch HBG TV</a>
    </section>
  </main><Footer /></>;
}
