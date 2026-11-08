"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { MINISTRY_EMAIL } from "@/lib/site";
import { currentEvent } from "@/config/currentEvent";
import { buttonClass } from "@/components/ui/Button";

const PRAYER_CATEGORIES = ["General", "Healing", "Family", "Work / Business", "Salvation", "Testimony"];
const VISIT_TYPES = ["First time", "Returning guest", "New convert"];

export const INQUIRY_TYPES = [
  "General Inquiry",
  "Prayer Request",
  "First-Timer Card",
  "Testimony Submission",
  "Department Application",
  "Partnership Inquiry",
  `${currentEvent.name} Registration`,
  "Event Registration",
  "Media/Sound Inquiry",
];

const field =
  "w-full rounded-xl border border-line bg-ivory px-4 py-3.5 text-text placeholder:text-muted/70 focus:border-gold-deep focus:outline-none focus:ring-2 focus:ring-gold/30";
const lbl = "mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-muted";

type Status = "idle" | "sending" | "success" | "error";

export default function ConnectForm({ departments }: { departments: string[] }) {
  const params = useSearchParams();
  const initialType = INQUIRY_TYPES.includes(params.get("type") ?? "") ? (params.get("type") as string) : "General Inquiry";
  const initialDept = departments.includes(params.get("department") ?? "") ? (params.get("department") as string) : departments[0] ?? "";

  const [status, setStatus] = useState<Status>("idle");
  const [errorDetail, setErrorDetail] = useState("");
  const [type, setType] = useState(initialType);
  const [f, setF] = useState({
    name: "",
    email: "",
    message: "",
    phone: "",
    category: PRAYER_CATEGORIES[0],
    confidential: false,
    area: "",
    visitType: VISIT_TYPES[0],
    invitedBy: "",
    prayerNeed: "",
    department: initialDept,
  });
  const set = (patch: Partial<typeof f>) => setF((prev) => ({ ...prev, ...patch }));

  const isPrayer = type === "Prayer Request";
  const isFirstTimer = type === "First-Timer Card";
  const isDept = type === "Department Application";

  const row = () => ({
    full_name: f.name.trim(),
    email: f.email.trim(),
    type,
    message: isFirstTimer ? f.prayerNeed : isDept ? `Department: ${f.department}\n\n${f.message}` : f.message,
    phone: isPrayer || isFirstTimer || isDept ? f.phone || null : null,
    category: isPrayer ? f.category : isDept ? f.department : null,
    confidential: isPrayer ? f.confidential : false,
    area: isFirstTimer ? f.area || null : null,
    visit_type: isFirstTimer ? f.visitType : null,
    invited_by: isFirstTimer ? f.invitedBy || null : null,
    prayer_need: isFirstTimer ? f.prayerNeed || null : null,
  });

  const mailto = () => {
    const r = row();
    const lines = [
      `Name: ${r.full_name}`,
      `Email: ${r.email}`,
      `Type: ${r.type}`,
      r.category && `${isDept ? "Department" : "Category"}: ${r.category}`,
      r.phone && `Phone: ${r.phone}`,
      r.area && `Area: ${r.area}`,
      r.visit_type && `Visit type: ${r.visit_type}`,
      r.invited_by && `Invited by: ${r.invited_by}`,
      "",
      isDept ? f.message : r.message || "",
    ].filter((x): x is string => typeof x === "string");
    return `mailto:${MINISTRY_EMAIL}?subject=${encodeURIComponent(`${type} — ${r.full_name}`)}&body=${encodeURIComponent(lines.join("\n"))}`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErrorDetail("");
    if (!isSupabaseConfigured) {
      setStatus("error");
      return;
    }
    const { error } = await supabase.from("inquiries").insert([row()]);
    if (error) {
      console.error("Inquiry submission failed:", error);
      setErrorDetail(error.message);
      setStatus("error");
    } else {
      setStatus("success");
    }
  };

  if (status === "success") {
    return (
      <div role="status" className="py-10 text-center">
        <CheckCircle2 size={56} className="mx-auto text-emerald-600" aria-hidden />
        <h2 className="mt-6 font-headline text-4xl text-text">Message received</h2>
        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted">
          Thank you for reaching out. A coordinator from the relevant department will review your {type.toLowerCase()} and connect with you shortly.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            set({ message: "", prayerNeed: "" });
          }}
          className={buttonClass("dark", "md", "mt-8")}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate={false}>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="c-name" className={lbl}>Full name</label>
          <input id="c-name" required autoComplete="name" value={f.name} onChange={(e) => set({ name: e.target.value })} className={field} />
        </div>
        <div>
          <label htmlFor="c-email" className={lbl}>Email address</label>
          <input id="c-email" required type="email" autoComplete="email" value={f.email} onChange={(e) => set({ email: e.target.value })} className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="c-type" className={lbl}>How can we help?</label>
        <select id="c-type" value={type} onChange={(e) => setType(e.target.value)} className={field}>
          {INQUIRY_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {isDept && departments.length > 0 && (
        <div>
          <label htmlFor="c-dept" className={lbl}>Department</label>
          <select id="c-dept" value={f.department} onChange={(e) => set({ department: e.target.value })} className={field}>
            {departments.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      )}

      {(isPrayer || isFirstTimer || isDept) && (
        <div>
          <label htmlFor="c-phone" className={lbl}>Phone <span className="font-medium normal-case tracking-normal">(optional)</span></label>
          <input id="c-phone" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} className={field} />
        </div>
      )}

      {isPrayer && (
        <div>
          <label htmlFor="c-cat" className={lbl}>Category</label>
          <select id="c-cat" value={f.category} onChange={(e) => set({ category: e.target.value })} className={field}>
            {PRAYER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      )}

      {isFirstTimer && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="c-area" className={lbl}>Area</label>
            <input id="c-area" value={f.area} onChange={(e) => set({ area: e.target.value })} placeholder="Where do you live?" className={field} />
          </div>
          <div>
            <label htmlFor="c-visit" className={lbl}>Visit type</label>
            <select id="c-visit" value={f.visitType} onChange={(e) => set({ visitType: e.target.value })} className={field}>
              {VISIT_TYPES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="c-invited" className={lbl}>Invited by <span className="font-medium normal-case tracking-normal">(optional)</span></label>
            <input id="c-invited" value={f.invitedBy} onChange={(e) => set({ invitedBy: e.target.value })} className={field} />
          </div>
        </div>
      )}

      {isPrayer && (
        <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
          <input type="checkbox" checked={f.confidential} onChange={(e) => set({ confidential: e.target.checked })} className="mt-0.5 h-5 w-5 accent-plum" />
          The team may contact me. Keep this confidential.
        </label>
      )}

      <div>
        <label htmlFor="c-msg" className={lbl}>
          {isFirstTimer ? "Prayer need (optional)" : isDept ? "Tell us about yourself" : "Your message"}
        </label>
        <textarea
          id="c-msg"
          required={!isFirstTimer}
          rows={6}
          value={isFirstTimer ? f.prayerNeed : f.message}
          onChange={(e) => (isFirstTimer ? set({ prayerNeed: e.target.value }) : set({ message: e.target.value }))}
          placeholder={isFirstTimer ? "Any specific prayer need?" : isDept ? "Your gifts, experience and why you’d like to serve." : "How can we help or partner with you?"}
          className={`${field} resize-y`}
        />
      </div>

      {status === "error" && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-900">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">We couldn’t send your message through the website.</p>
            <p className="mt-1">
              Nothing is lost — you can send it by email instead. Your details will be filled in for you.
              {errorDetail && <span className="sr-only"> Error: {errorDetail}</span>}
            </p>
            <a href={mailto()} className="mt-3 inline-flex items-center gap-2 font-semibold underline underline-offset-2">
              <Mail size={15} aria-hidden /> Email {MINISTRY_EMAIL}
            </a>
          </div>
        </div>
      )}

      <button type="submit" disabled={status === "sending"} className={buttonClass("dark", "lg", "w-full")}>
        <Send size={18} aria-hidden />
        {status === "sending"
          ? "Sending…"
          : isPrayer
            ? "Send Prayer Request"
            : isFirstTimer
              ? "Submit First-Timer Card"
              : isDept
                ? "Submit Application"
                : "Send to Ministry"}
      </button>
    </form>
  );
}
