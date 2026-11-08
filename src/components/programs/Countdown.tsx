"use client";

import { useEffect, useState } from "react";

function parts(target: number, now: number) {
  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    mins: Math.floor((diff % 3_600_000) / 60_000),
  };
}

/**
 * Live countdown to an ISO local time. Renders nothing on the server (the
 * visitor's clock decides), then ticks once a minute.
 */
export default function Countdown({ to, label }: { to: string; label: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  const target = new Date(to).getTime();
  if (now === null || now >= target) return null;
  const p = parts(target, now);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur" role="timer" aria-label={`${label}: ${p.days} days, ${p.hours} hours, ${p.mins} minutes`}>
      <p className="text-center text-xs font-bold uppercase tracking-[0.24em] text-gold">{label}</p>
      <div className="mt-5 grid grid-cols-3 gap-3" aria-hidden>
        {([
          ["Days", p.days],
          ["Hours", p.hours],
          ["Minutes", p.mins],
        ] as const).map(([l, v]) => (
          <div key={l} className="rounded-2xl bg-ink/60 py-5 text-center">
            <span className="block font-headline text-5xl font-light tabular-nums text-white">{String(v).padStart(2, "0")}</span>
            <span className="mt-1 block text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/55">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
