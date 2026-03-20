"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ComingSoonModal from "@/components/ComingSoonModal";
import { motion } from "framer-motion";
import { useState } from "react";

export default function WatchPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState("");

  const openModal = (feature: string) => {
    setActiveFeature(feature);
    setIsModalOpen(true);
  };
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 bg-slate-950 text-white flex flex-col items-center justify-center px-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-4xl w-full"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 border border-red-500/30 bg-red-500/10 rounded-full text-red-500 text-xs font-bold tracking-widest uppercase mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            Live Stream
          </span>
          
          <div className="relative aspect-video bg-white/5 rounded-3xl border border-white/10 overflow-hidden flex items-center justify-center group mb-12 shadow-2xl shadow-blue-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent"></div>
            
            {isPlaying ? (
              <iframe 
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1" 
                title="Heartbeat of God Living Stream" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
              ></iframe>
            ) : (
              <>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsPlaying(true)}
                  className="relative z-10 w-24 h-24 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shadow-xl"
                >
                  <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                </motion.button>
                <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-sm font-medium tracking-widest uppercase">
                  Heartbeat TV Official Stream
                </p>
              </>
            )}
          </div>

          <h1 className="font-headline text-4xl md:text-5xl mb-6">Atmosphere of Glory</h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-2xl mx-auto mb-12">
            Experience the unfiltered presence of God through our 24/7 broadcast. If the stream doesn't start automatically, please click the play button.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => openModal("Detailed Program Guide")}
              className="px-8 py-4 bg-white/10 border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">schedule</span>
              Program Guide
            </button>
            <button 
              onClick={() => openModal("Real-time Fellowship Chat")}
              className="px-8 py-4 bg-white/10 border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined">chat</span>
              Live Chat
            </button>
          </div>
        </motion.div>
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
