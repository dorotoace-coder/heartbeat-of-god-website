"use client";

import { useState } from "react";
import { Send, Check } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { MINISTRY_EMAIL } from "@/lib/site";

/** Stores a real sign-up in Supabase `inquiries`; falls back to email if that fails. */
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    if (!isSupabaseConfigured) {
      setState("error");
      return;
    }
    const { error } = await supabase.from("inquiries").insert([
      { full_name: "Newsletter subscriber", email, type: "Newsletter Signup", message: "Please add me to ministry updates." },
    ]);
    setState(error ? "error" : "done");
  };

  if (state === "done") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-gold-soft">
        <Check size={16} aria-hidden /> You’re on the list. God bless you.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <div className="flex rounded-full border border-white/15 bg-white/5 p-1 focus-within:border-gold/60">
        <input
          id="newsletter-email"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white placeholder:text-white/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold text-ink transition hover:bg-gold-soft disabled:opacity-60"
          aria-label="Subscribe"
        >
          <Send size={15} aria-hidden />
        </button>
      </div>
      {state === "error" && (
        <p role="alert" className="text-xs text-white/70">
          We couldn’t save that just now.{" "}
          <a
            className="text-gold-soft underline underline-offset-2"
            href={`mailto:${MINISTRY_EMAIL}?subject=${encodeURIComponent("Please add me to HBG updates")}&body=${encodeURIComponent(`Please add ${email} to ministry updates.`)}`}
          >
            Email us to subscribe
          </a>
          .
        </p>
      )}
    </form>
  );
}
