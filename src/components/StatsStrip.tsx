"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface Stat {
  value: number;
  suffix: string;
  label: string;
  icon: string;
  color: string;
}

const STATS: Stat[] = [
  { value: 9,   suffix: "+",  label: "Years of Ministry",  icon: "🕊️",  color: "rgba(200,162,208,0.9)" },
  { value: 12,  suffix: "+",  label: "Nations Reached",    icon: "🌍",  color: "rgba(212,175,55,0.9)"  },
  { value: 500, suffix: "+",  label: "Souls Won",          icon: "🔥",  color: "rgba(255,107,43,0.9)"  },
  { value: 8,   suffix: "",   label: "Services / Month",   icon: "🙌",  color: "rgba(100,200,120,0.9)" },
];

function CountUp({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const duration = 1600;
    const steps = 50;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setCount(Math.round(current));
      if (current >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [active, target]);

  return (
    <span>
      {count}{suffix}
    </span>
  );
}

export default function StatsStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative py-24 px-8 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0d0518 0%, #1a0828 50%, #0d0518 100%)" }}
    >
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(200,162,208,0.07) 0%, transparent 70%)" }} />

      {/* Gold line top */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)" }} />

      <div className="max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center text-[11px] font-black tracking-[0.22em] uppercase mb-12"
          style={{ color: "rgba(212,175,55,0.6)" }}
        >
          Ministry in Numbers
        </motion.p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30, rotateX: 15 }}
              animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex flex-col items-center justify-center p-8 rounded-3xl text-center cursor-default"
              style={{
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
                transformStyle: "preserve-3d",
              }}
              whileHover={{
                scale: 1.04,
                boxShadow: `0 16px 48px rgba(0,0,0,0.4), 0 0 32px ${stat.color.replace("0.9", "0.1")}, inset 0 1px 0 rgba(255,255,255,0.08)`,
                borderColor: stat.color.replace("0.9", "0.25"),
              }}
            >
              {/* Glow on hover */}
              <div
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0%, ${stat.color.replace("0.9", "0.06")} 0%, transparent 70%)` }}
              />

              <span className="text-4xl mb-4 block" style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.2))" }}>{stat.icon}</span>

              <div
                className="font-black mb-2 leading-none"
                style={{ fontSize: "clamp(36px,6vw,52px)", color: stat.color, fontVariantNumeric: "tabular-nums" }}
              >
                <CountUp target={stat.value} suffix={stat.suffix} active={inView} />
              </div>

              <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Gold line bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)" }} />
    </section>
  );
}
