"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComingSoonModal from "@/components/ComingSoonModal";
import TiltCard from "@/components/TiltCard";
import VlogSection from "@/components/VlogSection";
import { motion, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { PulseState } from "@/lib/pulse";

export default function Home() {
  const { scrollY } = useScroll();
  const yBg  = useTransform(scrollY, [0, 1000], [0, 300]);   // deepest — moves fastest
  const yMid = useTransform(scrollY, [0, 1000], [0, 150]);   // mid depth
  const yNear = useTransform(scrollY, [0, 1000], [0, 60]);   // near — barely moves
  const [pulse, setPulse] = useState<PulseState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState("");
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);

  const openModal = (feature: string) => {
    setActiveFeature(feature);
    setIsModalOpen(true);
  };

  useEffect(() => {
    // Fetch Pulse
    fetch("/api/pulse")
      .then((res) => res.json())
      .then((data) => setPulse(data))
      .catch((err) => console.error("Failed to load pulse", err));

    // Fetch Upcoming Events
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: true })
          .limit(3);
        
        if (error) throw error;
        setUpcomingEvents(data || []);
      } catch (err) {
        console.error("Failed to fetch upcoming events", err);
      }
    };
    fetchEvents();
  }, []);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero Section: The Sacred Interface */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden sacred-gradient divine-glow">
          {/* ── DEPTH LAYER 1: Deep nebula — moves fastest (full parallax) ── */}
          <motion.div style={{ y: yBg }} className="absolute inset-0 z-0 select-none pointer-events-none">
            <motion.img
              initial={{ scale: 1.15, opacity: 0 }}
              animate={{ scale: 1.05, opacity: 0.25 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              alt="Cosmic depth background"
              className="w-full h-full object-cover mix-blend-overlay"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFGc5ooAMR80HyOsFXacyDRBG5jYKB3Gb_oz8G6TQtLEMC9eIXpQ5S-oyyAVYpPsw2RY5jLtyndVME9dGEysD5GL25ovSNZ7U7IwPgcmQH15DoaTfPPUOs4OvQNuNkWIzW0RFeFPabwtcMais4Onz9KjtUYfuX7TlKzLcSIi5DLpDO06XfSU1G8YsxzvSw8GyFJffM2smvAkD3NICiXLpbEAr83lDejar1_PPb5DFwwRPULqAJGJQVFYxgneM3FQ9PkR93uEN6Fo4W"
            />
          </motion.div>

          {/* ── DEPTH LAYER 2: Mid — glowing orbs at half-speed ── */}
          <motion.div style={{ y: yMid }} className="absolute inset-0 z-[1] pointer-events-none">
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.12, 0.22, 0.12] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full blur-[140px]"
              style={{ background: "radial-gradient(circle, rgba(200,162,208,0.35) 0%, transparent 70%)" }}
            />
            <motion.div
              animate={{ scale: [1, 1.18, 1], opacity: [0.06, 0.14, 0.06] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 4 }}
              className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
              style={{ background: "radial-gradient(circle, rgba(212,175,55,0.2) 0%, transparent 70%)" }}
            />
          </motion.div>

          {/* ── DEPTH LAYER 3: Near — floating gold dust, barely moves ── */}
          <motion.div style={{ y: yNear }} className="absolute inset-0 z-[2] pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -18, 0], opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 5 + i * 1.3, repeat: Infinity, ease: "easeInOut", delay: i * 0.8 }}
                className="absolute rounded-full"
                style={{
                  width: `${4 + i * 2}px`, height: `${4 + i * 2}px`,
                  left: `${12 + i * 14}%`, top: `${20 + (i % 3) * 22}%`,
                  background: i % 2 === 0 ? "rgba(212,175,55,0.6)" : "rgba(200,162,208,0.5)",
                  filter: "blur(1px)",
                  boxShadow: i % 2 === 0 ? "0 0 8px rgba(212,175,55,0.8)" : "0 0 6px rgba(200,162,208,0.7)",
                }}
              />
            ))}
          </motion.div>
          
          <div className="relative z-10 w-full max-w-7xl px-8 mt-20 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Text Column */}
            <div className="flex-1 text-center lg:text-left">
              {pulse?.isLive ? (
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-5 py-2 mb-8 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-bold tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  Live Event: {pulse.activeEvent}
                </motion.span>
              ) : (
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="inline-block px-4 py-1.5 mb-8 bg-surface-container-highest/10 border border-white/10 rounded-full text-sky-dark text-[0.6875rem] font-medium tracking-[0.1em] uppercase shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                >
                  A Global Movement for Spiritual Awakening
                </motion.span>
              )}

              <motion.h1
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
                className="font-headline text-5xl md:text-6xl lg:text-7xl text-white font-light tracking-tight leading-[1.1] mb-10"
              >
                Bringing Men to the <span className="italic text-sky">Consciousness</span> of God’s Presence
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-6 mt-12"
              >
                <Link href="/watch" className="group flex items-center gap-3 px-8 py-4 bg-sky text-white rounded-xl font-semibold shadow-[0_0_15px_rgba(200,162,208,0.4)] hover:scale-105 transition-all duration-300 hover:bg-sky-dark">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "’FILL’ 1" }}>play_arrow</span>
                  Watch Live
                </Link>
                <Link href="/give" className="group flex items-center gap-3 px-8 py-4 bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 hover:scale-105">
                  Give Now
                </Link>
                <Link href="/departments" className="text-white/80 hover:text-white transition-colors font-medium flex items-center gap-2 group">
                  Join the Movement
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
              </motion.div>
            </div>

            {/* Pastor Photo Column — 3D interactive */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
              className="flex-shrink-0 relative hidden lg:block"
              style={{ perspective: "1400px" }}
            >
              {/* Glow ring behind photo */}
              <div className="absolute inset-0 rounded-3xl bg-sky/25 blur-3xl scale-110 -z-10" />

              {/* Gentle float wrapper */}
              <motion.div animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}>
                <TiltCard className="rounded-[1.75rem]" intensity={11} glowColor="rgba(200,162,208,0.28)">
                  {/* Photo frame */}
                  <div className="relative w-72 h-[420px] rounded-[1.75rem] overflow-hidden border border-white/15 shadow-2xl shadow-midnight/70"
                    style={{ boxShadow: "0 40px 90px rgba(10,4,22,0.7), 0 0 0 1px rgba(255,255,255,0.08), 0 8px 40px rgba(200,162,208,0.2)" }}>
                    <img
                      src="/pastor-amos.png"
                      alt="Pastor Amos Unogwu"
                      className="w-full h-full object-cover object-top"
                    />
                    {/* Subtle gradient fade at bottom */}
                    <div className="absolute inset-0 bg-gradient-to-t from-midnight/70 via-transparent to-transparent" />

                    {/* Name badge */}
                    <div className="absolute bottom-5 left-0 right-0 text-center">
                      <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-xs font-semibold tracking-widest uppercase">
                        Pastor Amos Unogwu
                      </span>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>

              {/* Floating accent: nations */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 px-3 py-2 bg-midnight-light/90 backdrop-blur border border-white/10 rounded-xl shadow-xl z-10"
              >
                <p className="text-white/50 text-[10px] uppercase tracking-widest mb-0.5">Reaching</p>
                <p className="text-white text-xs font-bold">🇳🇬 🇨🇦 🇩🇪</p>
              </motion.div>
            </motion.div>
          </div>
          
          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden [@media(min-height:820px)]:flex flex-col items-center gap-4 text-white/40 pointer-events-none"
          >
            <motion.span
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-[0.65rem] tracking-widest uppercase font-medium"
            >
              Scroll to Experience
            </motion.span>
            <div className="w-px h-16 bg-gradient-to-b from-white/40 to-transparent"></div>
          </motion.div>
        </section>

        {/* MTA 2026 — PRIMARY CAMPAIGN BANNER */}
        <section className="relative overflow-hidden py-20 px-8" style={{ background: "linear-gradient(135deg, #150005 0%, #1a0008 40%, #0d0002 100%)" }}>
          <div className="absolute top-0 left-1/3 w-[600px] h-64 rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, #ff4500, transparent)", filter: "blur(80px)" }} />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, #d4af37, transparent)", filter: "blur(60px)" }} />

          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center border"
                style={{ background: "rgba(255,69,0,0.12)", borderColor: "rgba(255,69,0,0.3)" }}>
                <span className="text-4xl">🔥</span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: "#ff6b2b" }}>Next Major Assembly</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                    style={{ color: "#d4af37", background: "rgba(212,175,55,0.1)", borderColor: "rgba(212,175,55,0.3)" }}>
                    Registration Open
                  </span>
                </div>
                <h3 className="font-headline text-3xl md:text-4xl text-white font-light mb-2">
                  MTA 2026 — <span className="italic" style={{ color: "#ff9a3c" }}>Mighty Turn Around Assembly</span>
                </h3>
                <p className="text-white/50 text-sm mb-3 italic" style={{ color: "rgba(212,175,55,0.7)" }}>
                  "There is a river whose streams make glad the city of God" — Psalm 46:4
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  {[
                    { icon: "calendar_month", text: "September 4–6, 2026", color: "#ff9a3c" },
                    { icon: "location_on", text: "Akute, Nigeria & Online", color: "#ff9a3c" },
                    { icon: "auto_awesome", text: "Free Admission", color: "#d4af37" },
                    { icon: "person", text: "Host: Pastor Amos Unogwu", color: "#d4af37" },
                  ].map((m) => (
                    <span key={m.text} className="flex items-center gap-1.5 text-white/50 text-xs">
                      <span className="material-symbols-outlined text-sm" style={{ color: m.color }}>{m.icon}</span>
                      {m.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
              <a href="https://mta.heartbeatofgod.ca" target="_blank" rel="noopener noreferrer"
                className="px-8 py-4 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-105 whitespace-nowrap"
                style={{ background: "linear-gradient(135deg, #ff6b2b, #d4450a)", color: "#fff", boxShadow: "0 8px 24px rgba(255,107,43,0.35)" }}>
                🔥 Register Free — MTA 2026
              </a>
              <a href="/mta-2026-announcement.html" target="_blank" rel="noopener noreferrer"
                className="px-7 py-4 rounded-xl font-semibold text-sm transition-all hover:bg-white/10 whitespace-nowrap text-center"
                style={{ border: "1px solid rgba(255,107,43,0.25)", color: "rgba(255,150,80,0.8)" }}>
                Learn More
              </a>
            </div>
          </div>
        </section>

        {/* Quick Access Bento Grid */}
        <section className="py-24 px-8 bg-surface">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.2 }
                }
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <TiltCard className="rounded-2xl" glowColor="rgba(212,175,55,0.15)">
              <Link href="/give" className="group p-10 bg-surface-container-lowest rounded-2xl shadow-sm transition-all hover:bg-surface-container-high cursor-pointer flex flex-col justify-between h-64">
                <div className="w-12 h-12 rounded-xl bg-midnight/5 flex items-center justify-center text-midnight group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">volunteer_activism</span>
                </div>
                <div>
                  <h3 className="font-headline text-2xl text-midnight mb-2">Giving</h3>
                  <p className="text-on-surface-variant leading-relaxed">Partner with us in spreading the word across nations.</p>
                </div>
              </Link>
              </TiltCard>
              <TiltCard className="rounded-2xl" glowColor="rgba(200,162,208,0.18)">
              <motion.div onClick={() => window.location.href='/departments'} variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }} className="group p-10 bg-surface-container-lowest rounded-2xl shadow-sm transition-all hover:bg-surface-container-high cursor-pointer flex flex-col justify-between h-64">
                <div className="w-12 h-12 rounded-xl bg-sky-light/10 flex items-center justify-center text-sky group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">groups</span>
                </div>
                <div>
                  <h3 className="font-headline text-2xl text-midnight mb-2">Join Department</h3>
                  <p className="text-on-surface-variant leading-relaxed">Discover your purpose by serving in our diverse teams.</p>
                </div>
              </motion.div>
              </TiltCard>
              <TiltCard className="rounded-2xl" glowColor="rgba(255,255,255,0.12)" intensity={8}>
              <motion.div onClick={() => window.location.href='/watch'} variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }} className={`group p-10 rounded-2xl shadow-xl cursor-pointer flex flex-col justify-between h-64 overflow-hidden relative transition-all ${pulse?.isLive ? 'bg-red-600 text-white shadow-red-500/30 animate-[pulse_3s_ease-in-out_infinite]' : 'bg-gradient-to-br from-midnight to-primary text-white shadow-midnight/20'}`}>
                <motion.div 
                  initial={{ rotate: 0 }}
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  className="absolute top-0 right-0 p-8 opacity-10"
                >
                  <span className="material-symbols-outlined text-9xl">podcasts</span>
                </motion.div>
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <span className="material-symbols-outlined text-3xl">live_tv</span>
                </div>
                <div>
                  <h3 className="font-headline text-2xl mb-2">{pulse?.isLive ? 'LIVE NOW' : 'Watch Live'}</h3>
                  <p className="text-white leading-relaxed break-words line-clamp-2 mix-blend-plus-lighter">{pulse?.isLive ? `Join ${pulse.activeEvent} happening now!` : 'Join our ongoing session and feel the atmosphere of glory.'}</p>
                </div>
              </motion.div>
              </TiltCard>
            </motion.div>
          </div>
        </section>

        {/* ── Heartbeat Vlog (pulls from Media library) ── */}
        <VlogSection />

        {/* ── Feed the Future — community project teaser ── */}
        <section className="relative py-24 px-8 overflow-hidden" style={{ background: "linear-gradient(135deg, #150005 0%, #1a0008 45%, #0d0002 100%)", perspective: "1400px" }}>
          <div className="absolute top-0 left-1/4 w-[600px] h-64 rounded-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, #ff4500, transparent)", filter: "blur(90px)" }} />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(ellipse, #d4af37, transparent)", filter: "blur(70px)" }} />

          <div className="max-w-7xl mx-auto relative z-10 flex flex-col lg:flex-row items-center gap-12">
            <motion.div
              initial={{ opacity: 0, rotateY: 10, y: 30 }}
              whileInView={{ opacity: 1, rotateY: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="flex-shrink-0"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center border"
                style={{ background: "rgba(255,69,0,0.12)", borderColor: "rgba(255,107,43,0.35)", boxShadow: "0 24px 60px rgba(255,69,0,0.25)" }}>
                <span className="material-symbols-outlined text-5xl" style={{ color: "#ff9a3c" }}>restaurant</span>
              </div>
            </motion.div>

            <div className="flex-1 text-center lg:text-left">
              <span className="inline-block px-3 py-1 mb-4 rounded-full text-[10px] font-bold uppercase tracking-widest"
                style={{ background: "rgba(255,107,43,0.12)", color: "#ff9a3c", border: "1px solid rgba(255,107,43,0.3)" }}>
                Community Project
              </span>
              <h2 className="font-headline text-3xl md:text-5xl text-white font-light mb-4 leading-tight">
                Feed the <span className="italic" style={{ color: "#ff9a3c" }}>Future</span>
              </h2>
              <p className="text-white/60 text-lg leading-relaxed max-w-2xl mb-6">
                We feed vulnerable families monthly — with dignity and structure. Not charity handed out and forgotten, but a full system of registration, distribution, documentation, and follow-up. Partner with us for real community impact.
              </p>
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
                <Link href="/feed-the-future" className="px-8 py-4 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-105 whitespace-nowrap"
                  style={{ background: "linear-gradient(135deg, #ff6b2b, #d4450a)", color: "#fff", boxShadow: "0 8px 24px rgba(255,107,43,0.35)" }}>
                  🍲 Explore the Project
                </Link>
                <Link href="/connect" className="px-7 py-4 rounded-xl font-semibold text-sm text-white/80 border border-white/15 hover:bg-white/5 hover:scale-105 transition-all whitespace-nowrap text-center">
                  Become a Partner
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Latest Message Section */}
        <section className="py-32 px-8 bg-surface-container-low relative overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              animate={{ y: [0, -8, 0] }}
              transition={{ x: { duration: 0.8 }, opacity: { duration: 0.8 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
              className="w-full lg:w-3/5 group relative aspect-video bg-primary rounded-3xl overflow-hidden"
              whileHover={{ scale: 1.02, rotateY: 2, rotateX: -1 }}
              style={{
                transformStyle: "preserve-3d",
                boxShadow: "0 24px 80px rgba(28,10,45,0.5), 0 8px 32px rgba(200,162,208,0.12), 0 0 0 1px rgba(255,255,255,0.06)"
              }}
            >
              {pulse && (
                <img
                  alt="Sermon thumbnail"
                  className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-700"
                  src={pulse.sermonOfTheDay.imageUrl}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  onClick={() => openModal("Video Message")}
                  className="w-20 h-20 rounded-full bg-sky text-white flex items-center justify-center shadow-[0_0_30px_rgba(14,165,233,0.4)] group-hover:scale-110 group-hover:shadow-[0_0_50px_rgba(14,165,233,0.6)] transition-all duration-300"
                >
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                </button>
              </div>
              <div className="absolute bottom-8 left-8 right-8 transform group-hover:translate-y-[-5px] transition-transform duration-300">
                <span className="text-sky text-xs font-bold tracking-widest uppercase mb-2 block">Word of the Day</span>
                <h2 className="font-headline text-3xl text-white leading-tight">{pulse ? pulse.sermonOfTheDay.title : 'Loading...'}</h2>
                <div className="flex items-center gap-2 mt-2 text-white/70 text-sm">
                  <span className="material-symbols-outlined text-sm">person</span>
                  <span>{pulse ? pulse.sermonOfTheDay.preacher : '...'}</span>
                </div>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="w-full lg:w-2/5 space-y-8"
            >
              <h2 className="font-headline text-4xl text-midnight leading-tight">Engage with the Living Word</h2>
              <p className="text-on-surface-variant text-lg leading-relaxed">
                Every message is a conduit for transformation. Explore our library of teachings designed to awaken the spirit of man to the divine reality.
              </p>
              <div className="space-y-6 pt-4">
                <div className="flex items-start gap-4">
                  <motion.span whileHover={{ scale: 1.2, rotate: 360 }} transition={{ duration: 0.5 }} className="material-symbols-outlined text-sky pt-1 cursor-default">check_circle</motion.span>
                  <div>
                    <p className="font-bold text-midnight">Biblical Authority</p>
                    <p className="text-on-surface-variant text-sm">Rooted in the uncompromised word of God.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <motion.span whileHover={{ scale: 1.2, rotate: 360 }} transition={{ duration: 0.5 }} className="material-symbols-outlined text-sky pt-1 cursor-default">check_circle</motion.span>
                  <div>
                    <p className="font-bold text-midnight">Spiritual Depth</p>
                    <p className="text-on-surface-variant text-sm">Exploring the mysteries of the Kingdom.</p>
                  </div>
                </div>
              </div>
              <Link href="/media" className="px-8 py-3 border border-outline-variant rounded-lg font-semibold hover:bg-midnight hover:text-white hover:border-transparent transition-all hover:scale-[1.02] inline-block text-center">
                Browse Media Archive
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Heart Beat Television Section using Deep Midnight for Contrast */}
        <section className="py-24 px-8 bg-midnight text-white relative flex items-center justify-center text-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-1/2 left-1/2 w-full max-w-4xl h-[400px] bg-sky/10 blur-[100px] -translate-x-1/2 -translate-y-1/2 rounded-[100%]" />
          </div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="w-full lg:w-1/2"
              >
                <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-blue-500/10 group-hover:shadow-blue-500/20 transition-all duration-500">
                  <img 
                    src="https://images.unsplash.com/photo-1593784991095-a205039470b6?q=80&w=2070&auto=format&fit=crop" 
                    alt="Heart Beat Television Control Room" 
                    className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-white text-5xl">tv_gen</span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="w-full lg:w-1/2 text-white"
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-12 h-px bg-red-500"></span>
                  <span className="text-red-500 font-bold tracking-widest text-sm uppercase">Broadcasting Live</span>
                </div>
                <h2 className="font-headline text-5xl md:text-6xl mb-8 leading-tight">
                  Heart Beat <span className="text-sky">Television</span>
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-xl">
                  Experience the message of the Kingdom 24/7. Tune in to our global television channel for uplifting music, revelatory teachings, and live encounters from across the world.
                </p>
                <div className="flex flex-wrap gap-6">
                  <Link 
                    href="/watch" 
                    className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-bold flex items-center gap-3 hover:bg-sky hover:text-on-sky hover:scale-105 transition-all duration-300"
                  >
                    <span className="material-symbols-outlined">live_tv</span>
                    Watch Channel Now
                  </Link>
                  <button 
                    onClick={() => openModal("Television Program Guide")}
                    className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center gap-3 hover:bg-white/10 hover:scale-105 transition-all duration-300"
                  >
                    <span className="material-symbols-outlined">schedule</span>
                    Program Guide
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── 3D Scripture Depth Block ── */}
        <section className="relative py-32 px-8 overflow-hidden" style={{ background: "linear-gradient(180deg, #1C0A2D 0%, #0d0518 50%, #1C0A2D 100%)" }}>
          {/* Ambient deep glow */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.14, 0.06] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="w-[700px] h-[400px] rounded-full blur-[120px]"
              style={{ background: "radial-gradient(ellipse, rgba(212,175,55,0.5) 0%, transparent 70%)" }}
            />
          </div>

          <div className="relative max-w-4xl mx-auto text-center" style={{ perspective: "1200px" }}>
            {/* LAYER 3 — Deepest: glowing reference text (behind everything) */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 1 }}
              style={{ translateZ: "-60px" }}
              className="text-[11px] font-black tracking-[0.35em] uppercase mb-6 pointer-events-none"
            >
              <span style={{ color: "rgba(212,175,55,0.35)", filter: "blur(0.5px)" }}>Psalm 46 : 10</span>
            </motion.div>

            {/* LAYER 2 — Mid: the verse itself */}
            <motion.h2
              initial={{ opacity: 0, y: 40, rotateX: 12 }}
              whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25, duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="font-headline leading-tight mb-10"
              style={{
                fontSize: "clamp(28px, 5vw, 56px)",
                color: "rgba(255,255,255,0.92)",
                textShadow: "0 0 60px rgba(212,175,55,0.15)",
                transformStyle: "preserve-3d",
              }}
            >
              &ldquo;Be still, and{" "}
              <motion.span
                animate={{ color: ["#d4af37", "#f0d060", "#d4af37"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                style={{ display: "inline-block" }}
              >
                know
              </motion.span>{" "}
              that I am God.&rdquo;
            </motion.h2>

            {/* LAYER 1 — Closest: floating reference pill */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              animate={{ y: [0, -6, 0] }}
              style={{
                display: "inline-flex", alignItems: "center", gap: "10px",
                padding: "10px 24px",
                background: "rgba(212,175,55,0.12)",
                border: "1.5px solid rgba(212,175,55,0.35)",
                borderRadius: "100px",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(212,175,55,0.15), 0 0 0 1px rgba(212,175,55,0.1)",
              }}
            >
              <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#d4af37" }}>
                Psalm 46 : 10
              </span>
            </motion.div>
          </div>
        </section>

        {/* Upcoming Events */}
        <section className="py-32 px-8 bg-surface">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex justify-between items-end mb-16"
            >
              <div>
                <span className="text-sky font-bold text-[0.7rem] tracking-[0.2em] uppercase">Don't Miss Out</span>
                <h2 className="font-headline text-5xl text-midnight mt-2">Upcoming Encounters</h2>
              </div>
              <Link className="text-midnight font-semibold border-b border-midnight pb-1 hover:text-sky hover:border-sky transition-colors" href="/programs">View Calendar</Link>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              
              {/* Highlighted Next Event Card - Automated via Pulse OS */}
              {upcomingEvents.length === 0 ? (
                // Hardcoded Fallback for Preview Perfection
                <>
                  {/* MTA 2026 — Featured event card */}
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="group rounded-xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative col-span-1" style={{ background: "linear-gradient(135deg, #1a0008 0%, #2a0d10 100%)", border: "2px solid rgba(255,107,43,0.35)" }}>
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity -z-10">
                      <span className="material-symbols-outlined text-9xl" style={{ color: "#ff6b2b" }}>local_fire_department</span>
                    </div>
                    <div className="p-8 h-full flex flex-col justify-between">
                      <div>
                        <div className="inline-block px-3 py-1 rounded-full mb-6 text-xs font-bold uppercase tracking-wider" style={{ background: "rgba(255,107,43,0.15)", color: "#ff9a3c", border: "1px solid rgba(255,107,43,0.3)" }}>
                          Signature Event · Sept 4–6
                        </div>
                        <h3 className="font-headline text-3xl text-white mb-2">MTA 2026</h3>
                        <p className="italic mb-4" style={{ color: "#ff9a3c" }}>Mighty Turn Around Assembly</p>
                        <p className="text-white/50 text-sm leading-relaxed mb-6">
                          &ldquo;There is a river whose streams make glad the city of God&rdquo; · Akute, Nigeria &amp; Online
                        </p>
                      </div>
                      <a
                        href="https://mta.heartbeatofgod.ca"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all hover:scale-105"
                        style={{ background: "linear-gradient(135deg, #ff6b2b, #d4450a)", color: "#fff" }}
                      >
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                        Register Free
                      </a>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="group bg-surface-container-low rounded-xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                    <div className="relative h-64 overflow-hidden">
                      <img alt="Sunday Service" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="/salvation.jpg" />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded text-xs font-bold text-midnight shadow-sm">WEEKLY</div>
                    </div>
                    <div className="p-8">
                      <h3 className="font-headline text-2xl text-midnight mb-3 group-hover:text-sky transition-colors">Sunday Celebration Service</h3>
                      <p className="text-on-surface-variant mb-6 text-sm leading-relaxed">Praise, worship, and the Word — every Sunday</p>
                      <div className="flex items-center gap-2 text-on-surface-variant text-xs font-semibold">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>Sundays · 9:00 AM</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="group bg-surface-container-low rounded-xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                    <div className="p-8 h-full flex flex-col justify-between">
                      <div>
                        <div className="w-12 h-12 rounded-xl bg-sky/10 flex items-center justify-center text-sky mb-6">
                          <span className="material-symbols-outlined">bedtime</span>
                        </div>
                        <h3 className="font-headline text-2xl text-midnight mb-3">Night of Prayer</h3>
                        <p className="text-on-surface-variant text-sm leading-relaxed mb-6">All-night intercession and encounter with God.</p>
                      </div>
                      <div className="flex items-center gap-2 text-on-surface-variant text-xs font-semibold">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>Fridays · 10:00 PM</span>
                      </div>
                    </div>
                  </motion.div>
                </>
              ) : (
                <>
                  {/* Highlighted Next Event Card */}
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="group bg-blue-50 dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border-2 border-blue-100 dark:border-blue-900/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative">
                    <div className="absolute top-0 right-0 p-6 text-blue-200 dark:text-blue-900/30 -z-10 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-9xl">event</span>
                    </div>
                    <div className="p-8 h-full flex flex-col justify-between">
                      <div>
                        <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full mb-6 uppercase tracking-wider">Next On Schedule</div>
                        <h3 className="font-headline text-3xl text-midnight mb-3">{upcomingEvents[0].name}</h3>
                        <p className="text-on-surface-variant font-medium text-lg leading-relaxed mb-6">
                            {(() => {
                              const d = new Date(upcomingEvents[0].event_date);
                              // Extract UTC components to show the "intended" time regardless of local offset
                              const hours = d.getUTCHours();
                              const minutes = d.getUTCMinutes().toString().padStart(2, '0');
                              const ampm = hours >= 12 ? 'PM' : 'AM';
                              const h12 = hours % 12 || 12;
                              return `${d.toLocaleDateString([], { dateStyle: 'full' })} at ${h12}:${minutes} ${ampm}`;
                            })()}
                        </p>
                      </div>
                      <button 
                        onClick={() => openModal("Event Reminder Notification")}
                        className="flex items-center gap-2 text-midnight font-bold text-sm"
                      >
                        <span className="material-symbols-outlined text-sm">notifications_active</span>
                        <span>Set Reminder</span>
                      </button>
                    </div>
                  </motion.div>
                  
                  {upcomingEvents.slice(1, 3).map((event, i) => (
                    <motion.div key={event.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + (i * 0.1) }} className="group bg-surface-container-low rounded-xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                      <div className="relative h-64 overflow-hidden">
                        <img
                          alt={event.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          src={event.image_url || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2070&auto=format&fit=crop"}
                        />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded text-xs font-bold text-midnight shadow-sm">
                          {new Date(event.event_date).toLocaleDateString([], { month: 'short', day: '2-digit' }).toUpperCase()}
                        </div>
                      </div>
                      <div className="p-8">
                        <h3 className="font-headline text-2xl text-midnight mb-3 group-hover:text-sky transition-colors line-clamp-1">{event.name}</h3>
                        <p className="text-on-surface-variant mb-6 text-sm leading-relaxed line-clamp-2">{event.description}</p>
                        <div className="flex items-center gap-2 text-on-surface-variant text-xs font-semibold">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          <span>
                            {(() => {
                              const d = new Date(event.event_date);
                              const hours = d.getUTCHours();
                              const minutes = d.getUTCMinutes().toString().padStart(2, '0');
                              const ampm = hours >= 12 ? 'PM' : 'AM';
                              const h12 = hours % 12 || 12;
                              return `${h12}:${minutes} ${ampm}`;
                            })()} • {event.location}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <ComingSoonModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        featureName={activeFeature} 
      />
    </>
  );
}
