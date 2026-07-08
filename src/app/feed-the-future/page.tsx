"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TiltCard from "@/components/TiltCard";
import { motion } from "framer-motion";
import { Heart, Utensils, ClipboardCheck, Users, HandHeart, Camera } from "lucide-react";

const PILLARS = [
  { icon: ClipboardCheck, title: "Registration", body: "Every family is registered with dignity — names, needs, and follow-up tracked, never anonymous." },
  { icon: Utensils, title: "Food Distribution", body: "Monthly distribution of food to vulnerable families, run with order and structure." },
  { icon: Camera, title: "Documentation", body: "Photos, testimonies, and records preserved for every outreach — full transparency." },
  { icon: HandHeart, title: "Follow-Up", body: "We stay connected after the meal — care that continues beyond the moment." },
];

const REPORT = [
  { label: "Families Fed", note: "Registered & served each month" },
  { label: "Individuals Reached", note: "Total lives touched" },
  { label: "Partners Involved", note: "Sponsors recognised each cycle" },
];

export default function FeedTheFuturePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative pt-40 pb-28 px-8 overflow-hidden" style={{ background: "linear-gradient(135deg, #0b0416 0%, #1a0c2a 55%, #0b0416 100%)", perspective: "1400px" }}>
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,107,43,0.16), transparent 70%)" }} />
          <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] rounded-full blur-[130px] pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(212,175,55,0.14), transparent 70%)" }} />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <motion.span
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full text-xs font-bold tracking-widest uppercase"
              style={{ background: "rgba(255,107,43,0.12)", color: "#ff9a3c", border: "1px solid rgba(255,107,43,0.3)" }}
            >
              <Heart size={14} className="fill-current" /> A Community Project of HBG Ministry
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 30, rotateX: 10 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="font-headline text-5xl md:text-7xl text-white font-light leading-[1.05] mb-8"
              style={{ textShadow: "0 0 60px rgba(255,107,43,0.15)" }}
            >
              Feed the <span className="italic" style={{ color: "#ff9a3c" }}>Future</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="text-white/70 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
            >
              We feed vulnerable families monthly — with dignity and structure. This is not charity handed out and forgotten; it is a system of registration, distribution, documentation, and follow-up.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12"
            >
              <Link href="/connect" className="px-8 py-4 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #ff6b2b, #d4450a)", color: "#fff", boxShadow: "0 8px 24px rgba(255,107,43,0.35)" }}>
                <HandHeart size={18} /> Become a Partner
              </Link>
              <Link href="/give" className="px-8 py-4 rounded-xl font-semibold text-sm text-white/80 border border-white/15 hover:bg-white/5 hover:scale-105 transition-all">
                Sponsor an Outreach
              </Link>
            </motion.div>
          </div>
        </section>

        {/* How it works — 3D pillars */}
        <section className="py-28 px-8 bg-surface" style={{ perspective: "1400px" }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-sky font-bold text-sm tracking-[0.2em] uppercase">Built as a System, Not a Handout</span>
              <h2 className="font-headline text-4xl md:text-5xl text-midnight mt-3">How Feed the Future Works</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PILLARS.map((p, i) => (
                <TiltCard key={p.title} className="rounded-3xl h-full" glowColor="rgba(255,107,43,0.15)">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="h-full p-8 bg-white rounded-3xl border border-outline-variant/30 shadow-sm"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                      style={{ background: "rgba(255,107,43,0.1)", color: "#e05a12" }}>
                      <p.icon size={26} />
                    </div>
                    <span className="text-[11px] font-black tracking-widest uppercase text-on-surface-variant/50">Step {i + 1}</span>
                    <h3 className="font-headline text-2xl text-midnight mt-1 mb-3">{p.title}</h3>
                    <p className="text-on-surface-variant text-sm leading-relaxed">{p.body}</p>
                  </motion.div>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* Partnership pitch */}
        <section className="py-28 px-8 relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, #150005 0%, #1a0008 45%, #0d0002 100%)" }}>
          <div className="absolute top-0 left-1/3 w-[600px] h-64 rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, #ff4500, transparent)", filter: "blur(90px)" }} />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <Users size={40} className="mx-auto mb-6" style={{ color: "#ff9a3c" }} />
            <h2 className="font-headline text-3xl md:text-5xl font-light mb-8 leading-tight">
              We are not asking for donations only — <span className="italic" style={{ color: "#ff9a3c" }}>we are offering partnership.</span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
              We invite organizations and individuals who want real community impact and visibility to support or sponsor one of our monthly outreaches. Partners receive recognition, documentation, and a monthly impact report.
            </p>
            <Link href="/connect" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #ff6b2b, #d4450a)", color: "#fff", boxShadow: "0 8px 24px rgba(255,107,43,0.35)" }}>
              <HandHeart size={18} /> Partner With Feed the Future
            </Link>
          </div>
        </section>

        {/* Monthly impact report */}
        <section className="py-28 px-8 bg-surface-container-low">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-sky font-bold text-sm tracking-[0.2em] uppercase">Full Transparency</span>
              <h2 className="font-headline text-4xl md:text-5xl text-midnight mt-3">Every Month, a Public Impact Report</h2>
              <p className="text-on-surface-variant mt-4 max-w-2xl mx-auto">Each cycle we publish the numbers, the testimonies, the partners recognised, and the photo &amp; video documentation.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {REPORT.map((r, i) => (
                <motion.div
                  key={r.label}
                  initial={{ opacity: 0, y: 30, rotateX: 12 }} whileInView={{ opacity: 1, y: 0, rotateX: 0 }} viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="p-10 rounded-3xl bg-white border border-outline-variant/30 shadow-sm text-center"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div className="font-black text-transparent bg-clip-text mb-3"
                    style={{ fontSize: "clamp(40px,6vw,60px)", backgroundImage: "linear-gradient(135deg, #ff6b2b, #d4af37)" }}>
                    —
                  </div>
                  <p className="font-headline text-xl text-midnight">{r.label}</p>
                  <p className="text-on-surface-variant text-sm mt-1">{r.note}</p>
                </motion.div>
              ))}
            </div>
            <p className="text-center text-on-surface-variant/60 text-sm mt-10 italic">
              Numbers are published at the close of each monthly outreach.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
