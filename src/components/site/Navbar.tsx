"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X, Radio } from "lucide-react";
import { NAV_LINKS } from "@/lib/site";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled || open ? "bg-ink/85 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl" : "bg-gradient-to-b from-ink/70 to-transparent",
      )}
    >
      <nav aria-label="Main" className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3.5 sm:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="Heartbeat of God — home">
          <Image src="/hbg-logo.png" alt="" width={48} height={40} className="h-9 w-auto transition-transform duration-500 group-hover:scale-105" preload />
          <span className="hidden font-headline text-lg italic text-white sm:inline">Heartbeat of God</span>
        </Link>

        <ul className="hidden items-center gap-1 xl:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive(l.href) ? "text-gold-soft" : "text-white/75 hover:text-white",
                )}
              >
                {l.label}
                {isActive(l.href) && <span aria-hidden className="absolute inset-x-3.5 -bottom-0.5 h-px bg-gold/70" />}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 xl:flex">
          <Link href="/give" className={buttonClass("ghost-light", "md")}>Give</Link>
          <Link href="/watch" className={buttonClass("gold", "md")}>
            <Radio size={16} aria-hidden /> Watch Live
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="rounded-full p-2 text-white hover:bg-white/10 xl:hidden"
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="h-[calc(100dvh-64px)] overflow-y-auto border-t border-white/10 bg-ink px-5 pb-10 pt-4 xl:hidden"
          >
            <ul className="flex flex-col">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(l.href) ? "page" : undefined}
                    className={cn(
                      "block border-b border-white/5 py-4 font-headline text-2xl",
                      isActive(l.href) ? "text-gold-soft" : "text-white/85",
                    )}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <Link href="/give" onClick={() => setOpen(false)} className={buttonClass("ghost-light", "lg")}>Give</Link>
              <Link href="/watch" onClick={() => setOpen(false)} className={buttonClass("gold", "lg")}>Watch Live</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
