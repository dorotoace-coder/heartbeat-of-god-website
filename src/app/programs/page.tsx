"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComingSoonModal from "@/components/ComingSoonModal";
import TiltCard from "@/components/TiltCard";
import FlipClock from "@/components/FlipClock";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

interface EventItem {
  id: string;
  name: string;
  description: string;
  event_date: string;
  location: string;
  image_url?: string;
  is_highlighted?: boolean;
}

export default function ProgramsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [highlightedEvent, setHighlightedEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0 });

  // Compute next occurrence of a given weekday (0=Sun, 3=Wed)
  const getNextWeekday = (weekday: number) => {
    const now = new Date();
    const day = now.getDay();
    const diff = (weekday - day + 7) % 7 || 7;
    const next = new Date(now);
    next.setDate(now.getDate() + diff);
    next.setHours(weekday === 0 ? 9 : 18, 0, 0, 0);
    return next.toISOString();
  };

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: true });

        if (error) throw error;

        // Fix recurring past events: update their date to next occurrence
        const fixed = (data as EventItem[])?.map(e => {
          const isPast = new Date(e.event_date) < new Date();
          if (isPast && e.name.toLowerCase().includes('sunday')) {
            return { ...e, event_date: getNextWeekday(0), location: '200 Akute Rd, Akute & Online' };
          }
          if (isPast && e.name.toLowerCase().includes('wednesday')) {
            return { ...e, event_date: getNextWeekday(3), location: '200 Akute Rd, Akute & Online' };
          }
          return e;
        }) || [];

        setEvents(fixed);

        // Prefer explicitly highlighted → ILPC → next upcoming
        const highlighted =
          fixed.find(e => e.is_highlighted) ||
          fixed.find(e => e.name.toLowerCase().includes('ilpc')) ||
          fixed.find(e => new Date(e.event_date) >= new Date()) ||
          fixed[0];
        setHighlightedEvent(highlighted || null);
      } catch (err) {
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  useEffect(() => {
    if (!highlightedEvent) return;

    // Compute initial countdown immediately
    const computeCountdown = () => {
      const target = new Date(highlightedEvent.event_date).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        return { days: 0, hours: 0, mins: 0 };
      }
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      };
    };

    setCountdown(computeCountdown());

    const timer = setInterval(() => {
      const result = computeCountdown();
      setCountdown(result);
      if (result.days === 0 && result.hours === 0 && result.mins === 0) {
        clearInterval(timer);
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [highlightedEvent]);

  const openModal = (feature: string) => {
    setActiveFeature(feature);
    setIsModalOpen(true);
  };

  const corePrograms = [
    { name: "Evangelism and Outreach", time: "Quarterly", desc: "Our primary engine for soul-winning and global mission impact." },
    { name: "CLT Devotionals", time: "Daily / Weekly", desc: "Small group spiritual nourishment and intimate Word study." },
    { name: "Prayer & Fasting Seasons", time: "Monthly", desc: "Consecrated windows for seeking God's face and corporate breakthrough." },
    { name: "Mentorship Services", time: "By Appointment", desc: "One-on-one spiritual guidance and personalized life coaching." },
    { name: "Revival Gatherings", time: "Special Scheduled", desc: "High-intensity atmosphere of worship and prophetic demonstration." },
    { name: "Leadership Development", time: "Monthly", desc: "Training the next generation of Kingdom-focused administrators." },
    { name: "Discipleship Meetings", time: "Weekly", desc: "Deep-dives into the doctrine of Christ and spiritual maturity." },
    { name: "Spiritual Training", time: "Enrollment Based", desc: "Certificated courses covering biblical foundations and ministry." }
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 bg-surface">
        {/* Featured Program: Dynamic Highlight */}
        <section className="px-8 max-w-7xl mx-auto mb-32">
          {loading ? (
             <div className="bg-midnight/10 animate-pulse rounded-[3rem] h-[500px]"></div>
          ) : highlightedEvent && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="bg-midnight rounded-[3rem] p-12 lg:p-24 text-white relative overflow-hidden"
              style={{ boxShadow: '0 0 0 1px rgba(212,175,55,0.15), 0 32px 80px rgba(28,10,45,0.5)' }}
            >
              {/* Animated ambient blobs */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.14, 0.08] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-0 right-0 w-[600px] h-[600px] bg-sky rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2 pointer-events-none"
              />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.1, 0.06] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
                className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky/30 rounded-full blur-[100px] -translate-x-1/3 translate-y-1/3 pointer-events-none"
              />
              {/* Gold top border shimmer */}
              <motion.div
                animate={{ backgroundPosition: ['0% center', '200% center'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[3rem]"
                style={{ background: 'linear-gradient(90deg, transparent, #d4af37, #f0d060, #d4af37, transparent)', backgroundSize: '200%' }}
              />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <motion.span
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-sky font-bold text-sm tracking-[0.2em] uppercase mb-6 inline-block"
                  >
                    Flagship Event
                  </motion.span>
                  <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="font-headline text-5xl md:text-7xl mb-8 leading-tight"
                  >
                    {highlightedEvent.name}
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="text-white/70 text-lg md:text-xl mb-12 leading-relaxed"
                  >
                    {highlightedEvent.description}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="flex flex-col sm:flex-row gap-8 items-start sm:items-center"
                  >
                    <div className="flex flex-col">
                      <span className="text-sky text-xs font-bold uppercase tracking-widest mb-1">Upcoming Date</span>
                      <span className="text-2xl font-headline">
                        {(() => {
                          const d = new Date(highlightedEvent.event_date);
                          const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                          return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
                        })()}
                      </span>
                    </div>
                    <div className="hidden sm:block w-px h-12 bg-white/20" />
                    <div className="flex flex-col">
                      <span className="text-sky text-xs font-bold uppercase tracking-widest mb-1">Location</span>
                      <span className="text-2xl font-headline">{highlightedEvent.location}</span>
                    </div>
                  </motion.div>
                  {highlightedEvent.name.toLowerCase().includes('ilpc') ? (
                    <motion.a
                      href="https://ilpc.heartbeatofgod.ca"
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="mt-12 px-10 py-5 bg-white text-midnight rounded-2xl font-bold shadow-xl shadow-white/10 inline-block text-center"
                      style={{ boxShadow: '0 0 0 2px rgba(212,175,55,0.4), 0 12px 32px rgba(255,255,255,0.08)' }}
                    >
                      Register Free — ILPC 2026 →
                    </motion.a>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Link href="/connect" className="mt-12 px-10 py-5 bg-white text-midnight rounded-2xl font-bold shadow-xl inline-block text-center">
                        Register for Free
                      </Link>
                    </motion.div>
                  )}
                </div>
                <div className="hidden lg:block relative">
                  <div className="flex flex-col items-center gap-6">
                    <span className="text-sky font-black text-xs uppercase tracking-[0.22em]">Countdown</span>
                    <FlipClock
                      targetDate={highlightedEvent ? new Date(highlightedEvent.event_date) : new Date()}
                      accentColor="#C8A2D0"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </section>

        {/* Core Ministry Programs */}
        <section className="px-8 max-w-7xl mx-auto mb-32">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl text-midnight mb-4">Ministry Rhythm</h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">Explore our consistent patterns of spiritual engagement designed to keep your focus on the Kingdom.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {corePrograms.map((prog, i) => (
              <TiltCard key={prog.name} className="rounded-2xl" glowColor="rgba(200,162,208,0.15)">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group p-8 bg-white border border-outline-variant/30 rounded-2xl hover:border-sky hover:shadow-xl hover:shadow-sky/5 transition-all h-full"
              >
                <h3 className="font-headline text-xl text-midnight mb-4 group-hover:text-sky transition-colors">{prog.name}</h3>
                <p className="text-on-surface-variant text-sm mb-6 leading-relaxed opacity-70">{prog.desc}</p>
                <div className="flex items-center gap-2 text-label-small font-bold text-sky uppercase tracking-widest">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {prog.time}
                </div>
              </motion.div>
              </TiltCard>
            ))}
          </div>
        </section>

        {/* Global Rhythm */}
        <section className="px-8 max-w-7xl mx-auto py-24 mb-32 bg-surface-container-high rounded-[3rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-midnight/5 to-transparent"></div>
          <div className="relative z-10">
            <h2 className="font-headline text-4xl text-midnight mb-16 text-center">Annual Ministry Calendar</h2>
            <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
              {[
                { months: "Jan – Feb", focus: "Prayer, Consecration, Alignment", details: "Beginning the year with fasting and spiritual alignment." },
                { months: "Mar – Apr", focus: "Evangelism Focus & Salvation Challenge", details: "Major soul-winning initiatives and regional outreaches." },
                { months: "May – Jul", focus: "Teaching, Mentorship, Discipleship", details: "Focused training, leadership seminars, and spiritual growth series." },
                { months: "Aug – Sep", focus: "Deep Prayer Seasons & Major Gatherings", details: "Intensive 21-day prayer cycles and annual ministry conferences." },
                { months: "Oct – Dec", focus: "Celebration, Outreach, Thanksgiving", details: "End-of-year missions, charity work, and corporate praise." }
              ].map((period) => (
                <div key={period.months} className="flex flex-col md:flex-row items-center justify-between p-8 bg-white rounded-2xl border border-outline-variant/10 hover:border-sky/20 transition-all group">
                  <div className="mb-4 md:mb-0">
                    <span className="font-bold text-sky text-sm uppercase tracking-[0.2em] mb-2 block">{period.months}</span>
                    <span className="text-midnight font-headline text-2xl group-hover:text-sky-dark transition-colors">{period.focus}</span>
                  </div>
                  <p className="text-on-surface-variant text-sm max-w-xs text-center md:text-right opacity-60 italic leading-relaxed">
                    {period.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MTA26 Teaser */}
        <section className="px-8 max-w-7xl mx-auto mb-20">
          <motion.a
            href="/mta-2026-announcement.html"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.015 }}
            className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 md:p-14 rounded-[2.5rem] relative overflow-hidden text-white no-underline block"
            style={{ background: "linear-gradient(135deg, #0d0518 0%, #1a0828 60%, #0d0518 100%)", border: "1px solid rgba(255,107,43,0.2)", boxShadow: "0 0 0 1px rgba(212,175,55,0.08), 0 32px 80px rgba(255,60,0,0.1)" }}
          >
            {/* Fire glow */}
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(255,107,43,0.12) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
            {/* Gold shimmer top */}
            <motion.div
              animate={{ backgroundPosition: ["0% center", "300% center"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[2.5rem]"
              style={{ background: "linear-gradient(90deg, transparent, #ff6b2b, #d4af37, #ff6b2b, transparent)", backgroundSize: "300%" }}
            />
            <div className="relative z-10">
              <span className="block text-[11px] font-black tracking-[0.22em] uppercase mb-3" style={{ color: "#ff9a3c" }}>Coming September 2026</span>
              <h2 className="font-headline text-4xl md:text-5xl mb-3">
                <span style={{ color: "#d4af37" }}>MTA26</span>
              </h2>
              <p className="text-white/60 text-lg font-medium">Mighty Turn Around Assembly — a gathering of fire, prayer &amp; prophetic power.</p>
            </div>
            <div className="relative z-10 flex-shrink-0">
              <span className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base" style={{ background: "linear-gradient(135deg, #ff6b2b, #d4450a)", boxShadow: "0 8px 32px rgba(255,107,43,0.35)" }}>
                🔥 Learn More &amp; Save the Date →
              </span>
            </div>
          </motion.a>
        </section>

        {/* Bottom CTA */}
        <section className="px-8 max-w-4xl mx-auto text-center pb-20">
           <h3 className="font-headline text-3xl text-midnight mb-8">Need the detailed schedule?</h3>
           <button 
             onClick={() => openModal("Ministry Calendar PDF")}
             className="px-8 py-4 bg-midnight text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-midnight/20 transition-all"
           >
             Download Full PDF Calendar
           </button>
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
