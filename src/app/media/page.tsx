"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComingSoonModal from "@/components/ComingSoonModal";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface Sermon {
  id: string;
  title: string;
  preacher: string;
  category: string;
  date_preached: string;
  duration: string;
  thumbnail_url?: string;
}

export default function MediaPage() {
  const [activeCategory, setActiveCategory] = useState("All Messages");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState("");
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSermons() {
      setLoading(true);
      try {
        let query = supabase.from('sermons').select('*').order('date_preached', { ascending: false });
        
        if (activeCategory !== "All Messages") {
          query = query.eq('category', activeCategory);
        }

        const { data, error } = await query;
        if (error) throw error;
        setSermons((data as Sermon[]) || []);
      } catch (err) {
        console.error('Error fetching sermons:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSermons();
  }, [activeCategory]);

  const openModal = (feature: string) => {
    setActiveFeature(feature);
    setIsModalOpen(true);
  };
  const categories = ["All Messages", "Spiritual Growth", "The Holy Spirit", "Evangelism", "Prayer"];

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 bg-surface">
        <section className="px-8 max-w-7xl mx-auto mb-20 text-center">
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sky font-bold text-sm tracking-[0.2em] uppercase mb-4 inline-block"
          >
            Media Library
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-headline text-5xl md:text-7xl text-midnight mb-8"
          >
            Digital Archive
          </motion.h1>
          <div className="flex flex-wrap justify-center gap-4 mt-12">
            {categories.map((cat) => (
              <button 
                key={cat} 
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  activeCategory === cat 
                    ? "bg-midnight text-white shadow-lg shadow-midnight/20" 
                    : "bg-surface-container-high text-on-surface-variant hover:bg-outline-variant/20"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <section className="px-8 max-w-7xl mx-auto">
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
          >
            <AnimatePresence mode="popLayout">
              {loading ? (
                // Skeleton Loaders
                [1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video bg-surface-container-high rounded-3xl mb-6"></div>
                    <div className="h-8 bg-surface-container-high rounded-full w-3/4 mb-4"></div>
                    <div className="h-4 bg-surface-container-high rounded-full w-1/2"></div>
                  </div>
                ))
              ) : sermons.map((sermon) => (
                <motion.div 
                  key={sermon.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-video rounded-3xl overflow-hidden bg-surface-container-high mb-6 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-500">
                    <div className="absolute inset-0 bg-midnight/20 flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px] transition-all duration-500 z-10">
                      <div className="flex gap-4">
                         <button 
                           onClick={(e) => { e.stopPropagation(); openModal(`Video: ${sermon.title}`); }}
                           className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white hover:text-midnight transition-all"
                         >
                           <span className="material-symbols-outlined">play_arrow</span>
                         </button>
                         <button 
                           onClick={(e) => { e.stopPropagation(); openModal(`Audio: ${sermon.title}`); }}
                           className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center hover:bg-white hover:text-midnight transition-all"
                         >
                           <span className="material-symbols-outlined">headphones</span>
                         </button>
                      </div>
                    </div>
                    <img 
                      src={sermon.thumbnail_url || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2070&auto=format&fit=crop"} 
                      alt={sermon.title} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-110"
                    />
                    <div className="absolute bottom-4 right-4 bg-midnight/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded z-20">{sermon.duration}</div>
                  </div>
                  <h3 className="font-headline text-2xl text-midnight mb-2 group-hover:text-sky transition-colors line-clamp-2">
                    {sermon.title}
                  </h3>
                  <p className="text-on-surface-variant text-sm mb-4">{sermon.preacher} • {sermon.date_preached ? new Date(sermon.date_preached).toLocaleDateString() : 'Recent'}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
          
          {!loading && sermons.length > 0 && (
            <div className="mt-24 text-center">
              <button 
                onClick={() => openModal("Load More Messages")}
                className="px-8 py-4 border border-outline-variant rounded-xl font-bold hover:bg-midnight hover:text-white hover:border-transparent transition-all"
              >
                Load More Messages
              </button>
            </div>
          )}

          {!loading && sermons.length === 0 && (
            <div className="py-40 text-center">
              <p className="text-on-surface-variant text-xl">No messages found in this category.</p>
              <button 
                onClick={() => setActiveCategory("All Messages")}
                className="mt-6 text-sky font-bold underline"
              >
                Clear Filters
              </button>
            </div>
          )}
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
