"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComingSoonModal from "@/components/ComingSoonModal";
import { motion, useScroll, useTransform } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { PulseState } from "@/lib/pulse";

export default function Home() {
  const { scrollY } = useScroll();
  const yBg = useTransform(scrollY, [0, 1000], [0, 300]);
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
          {/* Immersive Motion Background Substitute */}
          <motion.div style={{ y: yBg }} className="absolute inset-0 z-0 select-none pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-secondary-container/10 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-on-primary-container/5 blur-[150px] rounded-full"></div>
            <motion.img
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.3 }}
              transition={{ duration: 2, ease: "easeOut" }}
              alt="Abstract light waves and cosmic depth"
              className="w-full h-full object-cover mix-blend-overlay"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFGc5ooAMR80HyOsFXacyDRBG5jYKB3Gb_oz8G6TQtLEMC9eIXpQ5S-oyyAVYpPsw2RY5jLtyndVME9dGEysD5GL25ovSNZ7U7IwPgcmQH15DoaTfPPUOs4OvQNuNkWIzW0RFeFPabwtcMais4Onz9KjtUYfuX7TlKzLcSIi5DLpDO06XfSU1G8YsxzvSw8GyFJffM2smvAkD3NICiXLpbEAr83lDejar1_PPb5DFwwRPULqAJGJQVFYxgneM3FQ9PkR93uEN6Fo4W"
            />
          </motion.div>
          
          <div className="relative z-10 max-w-5xl px-8 text-center mt-20">
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
                className="inline-block px-4 py-1.5 mb-8 bg-surface-container-highest/10 border border-white/10 rounded-full text-secondary-fixed-dim text-[0.6875rem] font-medium tracking-[0.1em] uppercase shadow-[0_0_15px_rgba(255,255,255,0.05)]"
              >
                A Global Movement for Spiritual Awakening
              </motion.span>
            )}
            
            <motion.h1
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
              className="font-headline text-5xl md:text-7xl lg:text-8xl text-white font-light tracking-tight leading-[1.1] mb-10"
            >
              Bringing Men to the <span className="italic text-secondary-fixed">Consciousness</span> of God’s Presence
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12"
            >
              <Link href="/watch" className="group flex items-center gap-3 px-8 py-4 bg-secondary-fixed text-on-secondary-fixed rounded-xl font-semibold shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-105 transition-all duration-300">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                Watch Live
              </Link>
              <Link href="/give" className="px-8 py-4 bg-white/5 backdrop-blur-md border border-white/20 text-white rounded-xl font-semibold hover:bg-white/10 transition-all duration-300 hover:scale-105">
                Give Now
              </Link>
              <Link href="/departments" className="text-white/80 hover:text-white transition-colors font-medium flex items-center gap-2 group">
                Join the Movement
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </motion.div>
          </div>
          
          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 text-white/40"
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
              <Link href="/give" className="group p-10 bg-surface-container-lowest rounded-2xl shadow-sm transition-all hover:bg-surface-container-high cursor-pointer flex flex-col justify-between h-64 hover:-translate-y-2">
                <div className="w-12 h-12 rounded-xl bg-primary-container/5 flex items-center justify-center text-primary-container group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">volunteer_activism</span>
                </div>
                <div>
                  <h3 className="font-headline text-2xl text-primary-container mb-2">Giving</h3>
                  <p className="text-on-surface-variant leading-relaxed">Partner with us in spreading the word across nations.</p>
                </div>
              </Link>
              <motion.div onClick={() => window.location.href='/departments'} variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }} className="group p-10 bg-surface-container-lowest rounded-2xl shadow-sm transition-all hover:bg-surface-container-high cursor-pointer flex flex-col justify-between h-64 hover:-translate-y-2">
                <div className="w-12 h-12 rounded-xl bg-secondary-container/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">groups</span>
                </div>
                <div>
                  <h3 className="font-headline text-2xl text-primary-container mb-2">Join Department</h3>
                  <p className="text-on-surface-variant leading-relaxed">Discover your purpose by serving in our diverse teams.</p>
                </div>
              </motion.div>
              <motion.div onClick={() => window.location.href='/watch'} variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }} className={`group p-10 rounded-2xl shadow-xl cursor-pointer flex flex-col justify-between h-64 overflow-hidden relative hover:-translate-y-2 transition-all ${pulse?.isLive ? 'bg-red-600 text-white shadow-red-500/30 animate-[pulse_3s_ease-in-out_infinite]' : 'bg-gradient-to-br from-primary-container to-primary text-white shadow-primary-container/20'}`}>
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
                  <p className="text-on-primary-container leading-relaxed break-words line-clamp-2 mix-blend-plus-lighter">{pulse?.isLive ? `Join ${pulse.activeEvent} happening now!` : 'Join our ongoing session and feel the atmosphere of glory.'}</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Latest Message Section */}
        <section className="py-32 px-8 bg-surface-container-low relative overflow-hidden">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="w-full lg:w-3/5 group relative aspect-video bg-primary rounded-2xl overflow-hidden shadow-2xl"
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
                  className="w-20 h-20 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shadow-[0_0_30px_rgba(255,224,136,0.3)] group-hover:scale-110 group-hover:shadow-[0_0_50px_rgba(255,224,136,0.5)] transition-all duration-300"
                >
                  <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                </button>
              </div>
              <div className="absolute bottom-8 left-8 right-8 transform group-hover:translate-y-[-5px] transition-transform duration-300">
                <span className="text-secondary-fixed text-xs font-bold tracking-widest uppercase mb-2 block">Word of the Day</span>
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
              <h2 className="font-headline text-4xl text-primary-container leading-tight">Engage with the Living Word</h2>
              <p className="text-on-surface-variant text-lg leading-relaxed">
                Every message is a conduit for transformation. Explore our library of teachings designed to awaken the spirit of man to the divine reality.
              </p>
              <div className="space-y-6 pt-4">
                <div className="flex items-start gap-4">
                  <motion.span whileHover={{ scale: 1.2, rotate: 360 }} transition={{ duration: 0.5 }} className="material-symbols-outlined text-secondary pt-1 cursor-default">check_circle</motion.span>
                  <div>
                    <p className="font-bold text-primary-container">Biblical Authority</p>
                    <p className="text-on-surface-variant text-sm">Rooted in the uncompromised word of God.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <motion.span whileHover={{ scale: 1.2, rotate: 360 }} transition={{ duration: 0.5 }} className="material-symbols-outlined text-secondary pt-1 cursor-default">check_circle</motion.span>
                  <div>
                    <p className="font-bold text-primary-container">Spiritual Depth</p>
                    <p className="text-on-surface-variant text-sm">Exploring the mysteries of the Kingdom.</p>
                  </div>
                </div>
              </div>
              <Link href="/media" className="px-8 py-3 border border-outline-variant rounded-lg font-semibold hover:bg-primary-container hover:text-white hover:border-transparent transition-all hover:scale-[1.02] inline-block text-center">
                Browse Media Archive
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Heart Beat Television - Prominent Link */}
        <section className="py-24 px-8 bg-slate-950 relative overflow-hidden group">
          {/* Decorative Elements */}
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/20 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-red-600/10 blur-[150px] rounded-full -translate-x-1/2 translate-y-1/2"></div>
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
                  Heart Beat <span className="text-secondary-fixed">Television</span>
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-xl">
                  Experience the message of the Kingdom 24/7. Tune in to our global television channel for uplifting music, revelatory teachings, and live encounters from across the world.
                </p>
                <div className="flex flex-wrap gap-6">
                  <Link 
                    href="/watch" 
                    className="px-10 py-5 bg-white text-slate-950 rounded-2xl font-bold flex items-center gap-3 hover:bg-secondary-fixed hover:text-on-secondary-fixed hover:scale-105 transition-all duration-300"
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
                <span className="text-secondary font-bold text-[0.7rem] tracking-[0.2em] uppercase">Don't Miss Out</span>
                <h2 className="font-headline text-5xl text-primary-container mt-2">Upcoming Encounters</h2>
              </div>
              <Link className="text-primary-container font-semibold border-b border-primary-container pb-1 hover:text-secondary hover:border-secondary transition-colors" href="/programs">View Calendar</Link>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              
              {/* Highlighted Next Event Card - Automated via Pulse OS */}
              {upcomingEvents.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="group bg-blue-50 dark:bg-slate-800 rounded-xl overflow-hidden shadow-md border-2 border-blue-100 dark:border-blue-900/50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative">
                  <div className="absolute top-0 right-0 p-6 text-blue-200 dark:text-blue-900/30 -z-10 group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-9xl">event</span>
                  </div>
                  <div className="p-8 h-full flex flex-col justify-between">
                    <div>
                      <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full mb-6 uppercase tracking-wider">Next On Schedule</div>
                      <h3 className="font-headline text-3xl text-primary-container mb-3">{upcomingEvents[0].name}</h3>
                      <p className="text-on-surface-variant font-medium text-lg leading-relaxed mb-6">
                          {new Date(upcomingEvents[0].event_date).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                      </p>
                    </div>
                    <button 
                      onClick={() => openModal("Event Reminder Notification")}
                      className="flex items-center gap-2 text-primary-container font-bold text-sm"
                    >
                      <span className="material-symbols-outlined text-sm">notifications_active</span>
                      <span>Set Reminder</span>
                    </button>
                  </div>
                </motion.div>
              )}
              
              {upcomingEvents.slice(1, 3).map((event, i) => (
                <motion.div key={event.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + (i * 0.1) }} className="group bg-surface-container-low rounded-xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                  <div className="relative h-64 overflow-hidden">
                    <img
                      alt={event.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      src={event.image_url || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2070&auto=format&fit=crop"}
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded text-xs font-bold text-primary-container shadow-sm">
                      {new Date(event.event_date).toLocaleDateString([], { month: 'short', day: '2-digit' }).toUpperCase()}
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="font-headline text-2xl text-primary-container mb-3 group-hover:text-secondary transition-colors line-clamp-1">{event.name}</h3>
                    <p className="text-on-surface-variant mb-6 text-sm leading-relaxed line-clamp-2">{event.description}</p>
                    <div className="flex items-center gap-2 text-on-surface-variant text-xs font-semibold">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span>{new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {event.location}</span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {upcomingEvents.length === 0 && (
                // Fallback / Placeholder cards
                [1, 2, 3].map(i => (
                  <div key={i} className="bg-surface-container-low animate-pulse rounded-xl h-96"></div>
                ))
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
