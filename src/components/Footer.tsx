"use client";

import { useState } from "react";
import Link from "next/link";
import { Youtube, Instagram, Facebook, Twitter } from "lucide-react";
export default function Footer() {
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribed(true);
    setTimeout(() => setSubscribed(false), 3000);
  };
  return (
    <footer className="bg-midnight w-full py-20 shadow-inner">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 px-12 max-w-7xl mx-auto text-left">
        <div className="col-span-1 md:col-span-1">
          <Link href="/" className="inline-block mb-6 group">
            <img src="/hbg-logo.png" alt="HBG Logo" className="h-16 w-auto group-hover:scale-105 transition-transform drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
            <div className="text-2xl font-light italic text-white font-serif mt-3">
              Heartbeat of God
            </div>
          </Link>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            An apostolic ministry committed to raising a generation of Christ-conscious believers globally.
          </p>
        </div>
        <div>
          <h4 className="text-blue-900 dark:text-amber-400 font-semibold mb-6">Movement</h4>
          <ul className="space-y-4">
            <li><Link className="text-slate-500 dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-100 hover:underline decoration-amber-500/30 underline-offset-4 transition-all" href="/about">Global Reach</Link></li>
            <li><Link className="text-slate-500 dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-100 hover:underline decoration-amber-500/30 underline-offset-4 transition-all" href="/departments">Join the Movement</Link></li>
            <li><Link className="text-slate-500 dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-100 hover:underline decoration-amber-500/30 underline-offset-4 transition-all" href="/media">Media Archive</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-blue-900 dark:text-amber-400 font-semibold mb-6">Connect</h4>
          <ul className="space-y-4">
            <li><Link className="text-slate-500 dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-100 hover:underline decoration-amber-500/30 underline-offset-4 transition-all" href="/connect">Partner With Us</Link></li>
            <li><Link className="text-slate-500 dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-100 hover:underline decoration-amber-500/30 underline-offset-4 transition-all" href="/connect">Contact Us</Link></li>
            <li><Link className="text-slate-500 dark:text-slate-400 hover:text-blue-900 dark:hover:text-blue-100 hover:underline decoration-amber-500/30 underline-offset-4 transition-all" href="/give">Giving Portal</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-blue-900 dark:text-amber-400 font-semibold mb-6">Stay Inspired</h4>
          <div className="relative">
            <form onSubmit={handleSubscribe}>
              <input 
                required
                className="w-full bg-white dark:bg-slate-900 border-0 focus:ring-1 focus:ring-amber-500 rounded-lg px-4 py-3 text-sm" 
                placeholder="Email Address" 
                type="email" 
              />
              <button type="submit" className="absolute right-2 top-1.5 p-1.5 text-blue-900 dark:text-amber-400">
                <span className="material-symbols-outlined">{subscribed ? "check" : "send"}</span>
              </button>
            </form>
            {subscribed && (
              <p className="absolute -bottom-6 left-0 text-[10px] text-emerald-500 font-bold uppercase tracking-widest animate-pulse">
                Thank you for subscribing!
              </p>
            )}
          </div>
          <div className="flex gap-4 mt-8">
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer">
              <Youtube size={20} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-pink-600 hover:text-white transition-all cursor-pointer">
              <Instagram size={20} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
              <Facebook size={20} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-sky-500 hover:text-white transition-all cursor-pointer">
              <Twitter size={20} />
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-12 mt-20 pt-8 border-t border-slate-200 dark:border-slate-800">
        <p className="text-slate-400 text-xs text-center">
          © {new Date().getFullYear()} Heartbeat of God Ministry. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
