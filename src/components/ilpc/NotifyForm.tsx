"use client";

import { useState } from "react";
import { Bell, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { MINISTRY_EMAIL } from "@/lib/site";
import { buttonClass } from "@/components/ui/Button";

const field =
  "w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3.5 text-white placeholder:text-white/40 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30";
const lbl = "mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-white/60";

type Status = "idle" | "sending" | "success" | "error";

/**
 * "Notify me" for a future programme. Saves to the same `inquiries` table the
 * Connect form uses, so it lands in the admin Intake Inbox under `type`.
 */
export default function NotifyForm({ type, eventName }: { type: string; eventName: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const message = `Please notify me when the ${eventName} dates are announced.`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    if (!isSupabaseConfigured) {
      setStatus("error");
      return;
    }
    const { error } = await supabase
      .from("inquiries")
      .insert([{ full_name: name.trim(), email: email.trim(), type, message }]);
    if (error) {
      console.error("Notify-me submission failed:", error);
      setStatus("error");
    } else {
      setStatus("success");
    }
  };

  if (status === "success") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-5 text-white">
        <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-gold" aria-hidden />
        <p className="leading-relaxed">You’re on the list. We’ll let you know as soon as the {eventName} dates are announced.</p>
      </div>
    );
  }

  const mailto = `mailto:${MINISTRY_EMAIL}?subject=${encodeURIComponent(`${type} — ${name}`)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`;

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="n-name" className={lbl}>Full name</label>
          <input id="n-name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="n-email" className={lbl}>Email address</label>
          <input id="n-email" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </div>
      </div>

      {status === "error" && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-red-300/40 bg-red-500/10 p-4 text-sm leading-relaxed text-white">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">We couldn’t save that through the website.</p>
            <a href={mailto} className="mt-2 inline-flex items-center gap-2 font-semibold underline underline-offset-2">
              <Mail size={15} aria-hidden /> Email {MINISTRY_EMAIL} instead
            </a>
          </div>
        </div>
      )}

      <button type="submit" disabled={status === "sending"} className={buttonClass("gold", "lg", "w-full sm:w-auto")}>
        <Bell size={18} aria-hidden />
        {status === "sending" ? "Saving…" : "Notify me"}
      </button>
    </form>
  );
}
