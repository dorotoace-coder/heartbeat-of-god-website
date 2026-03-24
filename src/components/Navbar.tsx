"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-xl shadow-purple-900/5 dark:shadow-none transition-colors duration-300">
      <nav className="flex justify-between items-center px-8 py-3 max-w-screen-2xl mx-auto">
        {/* Brand Identity */}
        <Link href="/" className="flex items-center gap-3 group">
          <img src="/hbg-logo.png" alt="HBG Logo" className="h-10 w-auto group-hover:scale-105 transition-transform" />
          <span className="text-xl font-light italic tracking-tight text-purple-dark dark:text-lilac font-serif hidden sm:inline">
            Heartbeat of God
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-10">
          <Link 
            className={`${pathname === "/" ? "text-purple-dark dark:text-lilac border-b-2 border-lilac/50 pb-1" : "text-slate-600 dark:text-slate-400 hover:text-purple-dark dark:hover:text-lilac"} font-medium transition-all`} 
            href="/"
          >
            Home
          </Link>
          <Link 
            className={`${pathname === "/about" ? "text-purple-dark dark:text-lilac border-b-2 border-lilac/50 pb-1" : "text-slate-600 dark:text-slate-400 hover:text-purple-dark dark:hover:text-lilac"} font-medium transition-all`} 
            href="/about"
          >
            About
          </Link>
          <Link 
            className={`${pathname === "/programs" ? "text-purple-dark dark:text-lilac border-b-2 border-lilac/50 pb-1" : "text-slate-600 dark:text-slate-400 hover:text-purple-dark dark:hover:text-lilac"} font-medium transition-all`} 
            href="/programs"
          >
            Programs
          </Link>
          <Link 
            className={`${pathname === "/media" ? "text-purple-dark dark:text-lilac border-b-2 border-lilac/50 pb-1" : "text-slate-600 dark:text-slate-400 hover:text-purple-dark dark:hover:text-lilac"} font-medium transition-all`} 
            href="/media"
          >
            Media
          </Link>
          <Link 
            className={`${pathname === "/departments" ? "text-purple-dark dark:text-lilac border-b-2 border-lilac/50 pb-1" : "text-slate-600 dark:text-slate-400 hover:text-purple-dark dark:hover:text-lilac"} font-medium transition-all`} 
            href="/departments"
          >
            Departments
          </Link>
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-4">
          <Link href="/give" className="px-5 py-2 rounded-xl text-purple-dark font-medium hover:bg-lilac-light/50 dark:hover:bg-slate-800 transition-all duration-300 active:scale-95">
            Give
          </Link>
          <Link href="/watch" className="px-6 py-2.5 bg-gradient-to-r from-purple-dark to-purple text-white rounded-lg font-medium shadow-lg shadow-purple/20 active:scale-95 transition-all text-center hover:shadow-purple/30">
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
              <Link onClick={() => setIsOpen(false)} className="text-purple-dark dark:text-lilac font-medium text-lg" href="/">Home</Link>
              <Link onClick={() => setIsOpen(false)} className="text-slate-600 dark:text-slate-400 text-lg" href="/about">About</Link>
              <Link onClick={() => setIsOpen(false)} className="text-slate-600 dark:text-slate-400 text-lg" href="/programs">Programs</Link>
              <Link onClick={() => setIsOpen(false)} className="text-slate-600 dark:text-slate-400 text-lg" href="/media">Media</Link>
              <Link onClick={() => setIsOpen(false)} className="text-slate-600 dark:text-slate-400 text-lg" href="/departments">Departments</Link>
              
              <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link href="/give" onClick={() => setIsOpen(false)} className="w-full px-5 py-3 rounded-xl border border-purple/20 text-purple-dark text-center dark:text-lilac font-medium active:scale-95 transition-all">
                  Give
                </Link>
                <Link href="/watch" onClick={() => setIsOpen(false)} className="w-full px-6 py-3 bg-gradient-to-r from-purple-dark to-purple text-white rounded-lg font-medium shadow-lg active:scale-95 transition-all text-center">
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
