"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { PRAYER_WALL_TABLE, type PrayerWallKind } from "@/lib/prayerWall";
import { MINISTRY_EMAIL } from "@/lib/site";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const field =
  "w-full rounded-xl border border-line bg-ivory px-4 py-3.5 text-text placeholder:text-muted/70 focus:border-gold-deep focus:outline-none focus:ring-2 focus:ring-gold/30";
const lbl = "mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted";

type Status = "idle" | "sending" | "success" | "error";

export default function PrayerWallForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [kind, setKind] = useState<PrayerWallKind>("prayer");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sharePublicly, setSharePublicly] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    if (!isSupabaseConfigured) {
      setStatus("error");
      return;
    }
    const { error } = await supabase.from(PRAYER_WALL_TABLE).insert([
      { kind, name: name.trim() || null, message: message.trim(), share_publicly: sharePublicly },
    ]);
    if (error) {
      console.error("Prayer wall submission failed:", error);
      setStatus("error");
    } else {
      setStatus("success");
    }
  };

  if (status === "success") {
    return (
      <div role="status" className="py-8 text-center">
        <CheckCircle2 size={52} className="mx-auto text-emerald-600" aria-hidden />
        <h3 className="mt-5 font-headline text-3xl text-text">{kind === "prayer" ? "We’re praying with you" : "Thank you for sharing"}</h3>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted">
          {sharePublicly
            ? "Our team will read it first. Once approved, it will appear on the wall."
            : "Only our prayer team will see it — it will not be posted publicly."}
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setMessage("");
          }}
          className={buttonClass("dark", "md", "mt-7")}
        >
          Share another
        </button>
      </div>
    );
  }

  const subject = kind === "prayer" ? "Prayer Request" : "Testimony";
  const mailto = `mailto:${MINISTRY_EMAIL}?subject=${encodeURIComponent(`${subject}${name ? ` — ${name}` : ""}`)}&body=${encodeURIComponent(message)}`;

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset>
        <legend className={lbl}>I’d like to share</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["prayer", "testimony"] as const).map((k) => (
            <label
              key={k}
              className={cn(
                "cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-semibold transition",
                kind === k ? "border-plum bg-plum text-white" : "border-line bg-ivory text-text hover:border-plum/40",
              )}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {k === "prayer" ? "A prayer request" : "A testimony"}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="pw-name" className={lbl}>
          Name <span className="font-medium normal-case tracking-normal">(optional — leave blank to stay anonymous)</span>
        </label>
        <input id="pw-name" maxLength={80} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </div>

      <div>
        <label htmlFor="pw-msg" className={lbl}>{kind === "prayer" ? "Your prayer request" : "Your testimony"}</label>
        <textarea
          id="pw-msg"
          required
          minLength={3}
          maxLength={2000}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={kind === "prayer" ? "What can we stand with you in prayer for?" : "What has God done for you?"}
          className={`${field} resize-y`}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
        <input type="checkbox" checked={sharePublicly} onChange={(e) => setSharePublicly(e.target.checked)} className="mt-0.5 h-5 w-5 accent-plum" />
        <span>
          Share publicly on the Prayer Wall. <span className="text-muted/80">Nothing is posted until our team approves it. Leave unticked to keep it between you and the prayer team.</span>
        </span>
      </label>

      {status === "error" && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-900">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">We couldn’t send this through the website.</p>
            <a href={mailto} className="mt-2 inline-flex items-center gap-2 font-semibold underline underline-offset-2">
              <Mail size={15} aria-hidden /> Email {MINISTRY_EMAIL} instead
            </a>
          </div>
        </div>
      )}

      <button type="submit" disabled={status === "sending"} className={buttonClass("dark", "lg", "w-full")}>
        <Send size={18} aria-hidden />
        {status === "sending" ? "Sending…" : kind === "prayer" ? "Send Prayer Request" : "Share Testimony"}
      </button>
    </form>
  );
}
