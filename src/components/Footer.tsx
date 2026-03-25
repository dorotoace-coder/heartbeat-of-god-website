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
          <p className="text-white/40 text-sm leading-relaxed mb-8">
            An apostolic ministry committed to raising a generation of Christ-conscious believers globally.
          </p>
        </div>
        <div>
          <h4 className="text-sky-light font-semibold mb-6">Movement</h4>
          <ul className="space-y-4">
            <li><Link className="text-white/40 hover:text-sky-light hover:underline decoration-sky/30 underline-offset-4 transition-all" href="/about">Global Reach</Link></li>
            <li><Link className="text-white/40 hover:text-sky-light hover:underline decoration-sky/30 underline-offset-4 transition-all" href="/departments">Join the Movement</Link></li>
            <li><Link className="text-white/40 hover:text-sky-light hover:underline decoration-sky/30 underline-offset-4 transition-all" href="/media">Media Archive</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sky-light font-semibold mb-6">Connect</h4>
          <ul className="space-y-4">
            <li><Link className="text-white/40 hover:text-sky-light hover:underline decoration-sky/30 underline-offset-4 transition-all" href="/connect">Partner With Us</Link></li>
            <li><Link className="text-white/40 hover:text-sky-light hover:underline decoration-sky/30 underline-offset-4 transition-all" href="/connect">Contact Us</Link></li>
            <li><Link className="text-white/40 hover:text-sky-light hover:underline decoration-sky/30 underline-offset-4 transition-all" href="/give">Giving Portal</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sky-light font-semibold mb-6">Stay Inspired</h4>
          <div className="relative">
            <form onSubmit={handleSubscribe}>
              <input 
                required
                className="w-full bg-white/10 border border-white/10 focus:ring-1 focus:ring-sky rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30" 
                placeholder="Email Address" 
                type="email" 
              />
              <button type="submit" className="absolute right-2 top-1.5 p-1.5 text-sky-light hover:text-sky transition-colors">
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
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:bg-red-600 hover:text-white transition-all cursor-pointer">
              <Youtube size={20} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:bg-pink-600 hover:text-white transition-all cursor-pointer">
              <Instagram size={20} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
              <Facebook size={20} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:bg-sky-dark hover:text-white transition-all cursor-pointer">
              <Twitter size={20} />
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-12 mt-20 pt-8 border-t border-white/10">
        <p className="text-white/30 text-xs text-center">
          © {new Date().getFullYear()} Heartbeat of God Ministry. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
