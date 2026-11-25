"use client";

import { useState, type FormEvent } from "react";

const SENT =
  "If an account exists for that email, we've sent a link to reset your password. Check your inbox and spam folder. The link works once and expires after an hour.";

/**
 * "Forgot password?" link that opens a small form and asks Supabase to email
 * a reset link pointing at /reset-password. The reply is the same whether or
 * not the email has an account, so the form cannot be used to find members.
 */
export default function ForgotPassword({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const dark = tone === "dark";
  const link = dark
    ? "text-sm text-white/50 underline hover:text-white/80"
    : "text-sm font-semibold text-purple-900 underline";
  const field = dark
    ? "mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"
    : "mt-2 min-h-12 w-full rounded-xl border border-purple-200 bg-white p-3 text-base text-slate-950";
  const submit = dark
    ? "min-h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
    : "inline-flex min-h-11 items-center justify-center rounded-xl border border-purple-200 px-4 py-2 text-sm font-semibold text-purple-950 disabled:opacity-60";
  const note = dark ? "text-sm text-blue-100/80" : "text-sm leading-6 text-slate-700";

  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) return;
    setBusy(true);
    setMessage("");
    try {
      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Supabase answers an unknown email exactly like a known one, so success
      // here never reveals whether the person has an account.
      if (!error) {
        setMessage(SENT);
      } else if (error.status === 429) {
        setMessage("Too many reset requests. Please wait an hour, then try again.");
      } else {
        setMessage(
          "We couldn't send the reset email just now. Please try again later, or contact the office if it keeps happening.",
        );
      }
    } catch {
      setMessage("The connection dropped. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={link} onClick={() => setOpen(true)}>
        Forgot password?
      </button>
    );
  }

  return (
    <form onSubmit={request} className="grid gap-3" aria-label="Reset your password">
      <label className={dark ? "text-sm text-blue-100/80" : "text-sm font-semibold"}>
        Email for the reset link
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} className={submit}>
          {busy ? "Sending…" : "Email me a reset link"}
        </button>
        <button type="button" className={link} onClick={() => { setOpen(false); setMessage(""); }}>
          Cancel
        </button>
      </div>
      {message && <p role="status" className={note}>{message}</p>}
    </form>
  );
}
