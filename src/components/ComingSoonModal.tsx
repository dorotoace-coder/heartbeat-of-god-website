"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

export default function ComingSoonModal({ isOpen, onClose, featureName }: ComingSoonModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
          >
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-fixed/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-container/10 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2" />

            <div className="relative z-10 text-center">
              <div className="w-20 h-20 bg-secondary-fixed/20 text-secondary-fixed rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-12 group-hover:rotate-0 transition-transform">
                <span className="material-symbols-outlined text-4xl">rocket_launch</span>
              </div>
              
              <h3 className="font-headline text-3xl text-primary-container mb-4">Phase Two Feature</h3>
              <p className="text-on-surface-variant leading-relaxed mb-8">
                The <span className="font-bold text-secondary">{featureName}</span> feature is currently in development as part of our Phase 2 expansion. 
              </p>
              
              <div className="p-6 bg-surface-container-low rounded-2xl mb-8 border border-outline-variant/10 text-sm">
                <p className="text-on-surface-variant/70 italic mb-4">
                  "But the vision is yet for an appointed time... wait for it; because it will surely come."
                </p>
                <div className="relative mt-4">
                  <input 
                    type="email" 
                    placeholder="Email for updates" 
                    className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-secondary transition-all"
                  />
                  <button className="absolute right-1 top-1 h-8 px-3 bg-secondary text-on-secondary rounded-lg text-xs font-bold hover:scale-105 transition-all">
                    Notify Me
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-4 bg-primary-container text-white rounded-xl font-bold hover:shadow-xl hover:shadow-primary-container/20 transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
