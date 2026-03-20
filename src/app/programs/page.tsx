"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComingSoonModal from "@/components/ComingSoonModal";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function ProgramsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [highlightedEvent, setHighlightedEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0 });

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: true });
        
        if (error) throw error;
        setEvents(data || []);
        
        const highlighted = data?.find(e => e.is_highlighted) || data?.[0];
        setHighlightedEvent(highlighted);
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

    const timer = setInterval(() => {
      const target = new Date(highlightedEvent.event_date).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, mins: 0 });
        clearInterval(timer);
      } else {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        });
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
             <div className="bg-primary-container/20 animate-pulse rounded-[3rem] h-[500px]"></div>
          ) : highlightedEvent && (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-primary rounded-[3rem] p-12 lg:p-24 text-white relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-secondary-fixed/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <span className="text-secondary font-bold text-sm tracking-[0.2em] uppercase mb-6 inline-block">Flagship Event</span>
                  <h1 className="font-headline text-5xl md:text-7xl mb-8 leading-tight">{highlightedEvent.name}</h1>
                  <p className="text-white/70 text-lg md:text-xl mb-12 leading-relaxed">
                    {highlightedEvent.description}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center">
                    <div className="flex flex-col">
                      <span className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Upcoming Date</span>
                      <span className="text-2xl font-headline">
                        {new Date(highlightedEvent.event_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="hidden sm:block w-px h-12 bg-white/20"></div>
                    <div className="flex flex-col">
                      <span className="text-secondary text-xs font-bold uppercase tracking-widest mb-1">Location</span>
                      <span className="text-2xl font-headline">{highlightedEvent.location}</span>
                    </div>
                  </div>
                  <Link href="/connect" className="mt-12 px-10 py-5 bg-white text-primary rounded-2xl font-bold hover:bg-secondary hover:text-white transition-all shadow-xl shadow-white/5 inline-block text-center">
                    Register for Free
                  </Link>
                </div>
                <div className="hidden lg:block relative">
                   <div className="aspect-square bg-white/5 backdrop-blur-3xl rounded-full border border-white/10 flex flex-col items-center justify-center p-12 text-center">
                      <span className="text-secondary font-bold text-xl uppercase tracking-widest mb-4">Countdown</span>
                      <div className="flex gap-6">
                         <div className="flex flex-col">
                            <span className="text-5xl font-headline">{String(countdown.days).padStart(2, '0')}</span>
                            <span className="text-[10px] uppercase tracking-tighter opacity-50">Days</span>
                         </div>
                         <div className="text-5xl font-headline opacity-20">:</div>
                         <div className="flex flex-col">
                            <span className="text-5xl font-headline">{String(countdown.hours).padStart(2, '0')}</span>
                            <span className="text-[10px] uppercase tracking-tighter opacity-50">Hrs</span>
                         </div>
                         <div className="text-5xl font-headline opacity-20">:</div>
                         <div className="flex flex-col">
                            <span className="text-5xl font-headline">{String(countdown.mins).padStart(2, '0')}</span>
                            <span className="text-[10px] uppercase tracking-tighter opacity-50">Min</span>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </section>

        {/* Core Ministry Programs */}
        <section className="px-8 max-w-7xl mx-auto mb-32">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl text-primary-container mb-4">Ministry Rhythm</h2>
            <p className="text-on-surface-variant max-w-2xl mx-auto">Explore our consistent patterns of spiritual engagement designed to keep your focus on the Kingdom.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {corePrograms.map((prog, i) => (
              <motion.div 
                key={prog.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group p-8 bg-white dark:bg-slate-900 border border-outline-variant/30 rounded-2xl hover:border-secondary hover:shadow-xl hover:shadow-secondary/5 transition-all"
              >
                <h3 className="font-headline text-xl text-primary-container mb-4 group-hover:text-secondary transition-colors">{prog.name}</h3>
                <p className="text-on-surface-variant text-sm mb-6 leading-relaxed opacity-70">{prog.desc}</p>
                <div className="flex items-center gap-2 text-label-small font-bold text-secondary uppercase tracking-widest">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  {prog.time}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Global Rhythm */}
        <section className="px-8 max-w-7xl mx-auto py-24 mb-32 bg-surface-container-high rounded-[3rem] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
          <div className="relative z-10">
            <h2 className="font-headline text-4xl text-primary-container mb-16 text-center">Annual Ministry Calendar</h2>
            <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
              {[
                { months: "Jan – Feb", focus: "Prayer, Consecration, Alignment", details: "Beginning the year with fasting and spiritual alignment." },
                { months: "Mar – Apr", focus: "Evangelism Focus & Salvation Challenge", details: "Major soul-winning initiatives and regional outreaches." },
                { months: "May – Jul", focus: "Teaching, Mentorship, Discipleship", details: "Focused training, leadership seminars, and spiritual growth series." },
                { months: "Aug – Sep", focus: "Deep Prayer Seasons & Major Gatherings", details: "Intensive 21-day prayer cycles and annual ministry conferences." },
                { months: "Oct – Dec", focus: "Celebration, Outreach, Thanksgiving", details: "End-of-year missions, charity work, and corporate praise." }
              ].map((period) => (
                <div key={period.months} className="flex flex-col md:flex-row items-center justify-between p-8 bg-white dark:bg-slate-900 rounded-2xl border border-outline-variant/10 hover:border-primary/20 transition-all group">
                  <div className="mb-4 md:mb-0">
                    <span className="font-bold text-secondary text-sm uppercase tracking-[0.2em] mb-2 block">{period.months}</span>
                    <span className="text-primary-container font-headline text-2xl group-hover:text-primary transition-colors">{period.focus}</span>
                  </div>
                  <p className="text-on-surface-variant text-sm max-w-xs text-center md:text-right opacity-60 italic leading-relaxed">
                    {period.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-8 max-w-4xl mx-auto text-center pb-20">
           <h3 className="font-headline text-3xl text-primary-container mb-8">Need the detailed schedule?</h3>
           <button 
             onClick={() => openModal("Ministry Calendar PDF")}
             className="px-8 py-4 bg-primary-container text-white rounded-xl font-bold hover:shadow-2xl hover:shadow-primary-container/20 transition-all"
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
