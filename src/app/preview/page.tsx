"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function PreviewPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 px-8 flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-secondary-container/20 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-container/10 blur-[120px] rounded-full pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 gap-16 relative z-10">
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center justify-center"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-bold tracking-widest uppercase w-max">
              <Sparkles size={14} className="fill-blue-500 text-blue-500" /> Preview
            </span>
            <h1 className="font-headline text-5xl md:text-7xl text-slate-900 dark:text-white mb-6 leading-[1.1]">
              Coming <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-amber-400 dark:to-orange-500 italic">Soon</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8 max-w-2xl mx-auto">
              We are working hard to bring you something amazing. Check back in the future to see what we've been building!
            </p>
          </motion.div>

        </div>
      </main>
      <Footer />
    </>
  );
}
