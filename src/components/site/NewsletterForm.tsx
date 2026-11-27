"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
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
        <Check size={16} className="shrink-0" aria-hidden />
        <span>You’re subscribed to ministry email updates. <Link href="/login" className="underline underline-offset-4">Sign in to PulseOS</Link></span>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="newsletter-email" className="block text-sm font-semibold text-white">Get ministry email updates</label>
      <p id="newsletter-purpose" className="text-xs leading-5 text-white/75">Email updates only—this does not create a PulseOS account.</p>
      <div className="flex flex-wrap gap-2">
        <input
          id="newsletter-email"
          required
          type="email"
          autoComplete="email"
          aria-describedby="newsletter-purpose"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="min-h-11 min-w-0 flex-[1_1_170px] rounded-full border border-white/25 bg-white/5 px-4 text-sm text-white placeholder:text-white/65 focus:outline-none focus:ring-2 focus:ring-gold/70"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-gold px-4 text-xs font-semibold text-ink transition hover:bg-gold-soft disabled:opacity-60"
        >
          {state === "sending" ? "Subscribing…" : "Subscribe to updates"}
        </button>
      </div>
      <p className="text-xs leading-5 text-white/75">Looking for your ministry workspace? <Link href="/login" className="font-semibold text-gold-soft underline underline-offset-4">Sign in to PulseOS</Link></p>
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
