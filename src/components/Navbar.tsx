"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-xl shadow-blue-900/5 dark:shadow-none transition-colors duration-300">
      <nav className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
        {/* Brand Identity */}
        <div className="text-2xl font-light italic tracking-tight text-blue-900 dark:text-blue-50 font-serif">
          Heartbeat of God
        </div>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-10">
          <Link 
            className={`${pathname === "/" ? "text-blue-900 dark:text-amber-400 border-b-2 border-amber-500/50 pb-1" : "text-slate-600 dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-100"} font-medium transition-all`} 
            href="/"
          >
            Home
          </Link>
          <Link 
            className={`${pathname === "/about" ? "text-blue-900 dark:text-amber-400 border-b-2 border-amber-500/50 pb-1" : "text-slate-600 dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-100"} font-medium transition-all`} 
            href="/about"
          >
            About
          </Link>
          <Link 
            className={`${pathname === "/programs" ? "text-blue-900 dark:text-amber-400 border-b-2 border-amber-500/50 pb-1" : "text-slate-600 dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-100"} font-medium transition-all`} 
            href="/programs"
          >
            Programs
          </Link>
          <Link 
            className={`${pathname === "/media" ? "text-blue-900 dark:text-amber-400 border-b-2 border-amber-500/50 pb-1" : "text-slate-600 dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-100"} font-medium transition-all`} 
            href="/media"
          >
            Media
          </Link>
          <Link 
            className={`${pathname === "/departments" ? "text-blue-900 dark:text-amber-400 border-b-2 border-amber-500/50 pb-1" : "text-slate-600 dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-100"} font-medium transition-all`} 
            href="/departments"
          >
            Departments
          </Link>
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-4">
          <Link href="/give" className="px-5 py-2 rounded-xl text-primary-container font-medium hover:bg-slate-100/50 dark:hover:bg-slate-800 transition-all duration-300 active:scale-95">
            Give
          </Link>
          <Link href="/watch" className="px-6 py-2.5 bg-gradient-to-r from-primary-container to-primary text-on-primary rounded-lg font-medium shadow-lg shadow-primary/10 active:scale-95 transition-all text-center">
            Watch Live
          </Link>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button 
          className="lg:hidden p-2 text-primary-container dark:text-blue-50 focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="material-symbols-outlined text-3xl">
            {isOpen ? "close" : "menu"}
          </span>
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <div className="flex flex-col px-8 py-6 gap-6">
              <Link onClick={() => setIsOpen(false)} className="text-blue-900 dark:text-amber-400 font-medium text-lg" href="/">Home</Link>
              <Link onClick={() => setIsOpen(false)} className="text-slate-600 dark:text-slate-400 text-lg" href="/about">About</Link>
              <Link onClick={() => setIsOpen(false)} className="text-slate-600 dark:text-slate-400 text-lg" href="/programs">Programs</Link>
              <Link onClick={() => setIsOpen(false)} className="text-slate-600 dark:text-slate-400 text-lg" href="/media">Media</Link>
              <Link onClick={() => setIsOpen(false)} className="text-slate-600 dark:text-slate-400 text-lg" href="/departments">Departments</Link>
              
              <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link href="/give" onClick={() => setIsOpen(false)} className="w-full px-5 py-3 rounded-xl border border-primary-container/20 text-primary-container text-center dark:text-blue-50 font-medium active:scale-95 transition-all">
                  Give
                </Link>
                <Link href="/watch" onClick={() => setIsOpen(false)} className="w-full px-6 py-3 bg-gradient-to-r from-primary-container to-primary text-white rounded-lg font-medium shadow-lg active:scale-95 transition-all text-center">
                  Watch Live
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
