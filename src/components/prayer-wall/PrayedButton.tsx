"use client";

import { useEffect, useState } from "react";
import { HandHeart } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/cn";

const KEY = "hbg-prayed";

function prayedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/** "We prayed" — one tap per entry per browser. */
export default function PrayedButton({ id, initial }: { id: string; initial: number }) {
  const [count, setCount] = useState(initial);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Read after mount so server and client render the same markup.
    const t = setTimeout(() => setDone(prayedIds().includes(id)), 0);
    return () => clearTimeout(t);
  }, [id]);

  const pray = async () => {
    if (done || busy || !isSupabaseConfigured) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("prayer_wall_pray", { entry_id: id });
    setBusy(false);
    if (error) {
      console.error("prayer_wall_pray failed:", error);
      return;
    }
    setCount(typeof data === "number" ? data : count + 1);
    setDone(true);
    try {
      localStorage.setItem(KEY, JSON.stringify([...prayedIds(), id].slice(-500)));
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={pray}
      disabled={done || busy}
      aria-pressed={done}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition",
        done ? "border-gold-deep/40 bg-gold/15 text-gold-deep" : "border-line text-plum hover:border-plum/40 hover:bg-plum/5",
      )}
    >
      <HandHeart size={15} aria-hidden />
      {done ? "You prayed" : "I prayed"}
      {count > 0 && <span className="font-semibold text-muted">· {count}</span>}
    </button>
  );
}
