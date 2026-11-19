"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

export default function AcceptStaffInvite() {
  const started = useRef(false);
  const inviteHash = useRef<string | null>(null);
  const invitedUser = useRef<string | null>(null);
  const [status, setStatus] = useState<"checking" | "invalid" | "ready" | "saved">("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    window.history.replaceState(null, "", window.location.pathname);
    const tokenHash = params.get("token_hash");
    if (params.get("type") === "invite" && tokenHash) {
      // Verify on form submission so opening or previewing the email link
      // does not consume the invitation.
      inviteHash.current = tokenHash;
      queueMicrotask(() => setStatus("ready"));
      return;
    }
    if (params.get("type") !== "invite" || !access_token || !refresh_token) {
      queueMicrotask(() => setStatus("invalid"));
      return;
    }
    async function verify() {
      try {
        const { supabase } = await import("@/lib/supabase");
        const result = await supabase.auth.setSession({ access_token: access_token!, refresh_token: refresh_token! });
        invitedUser.current = result.data.session?.user.id ?? null;
        setStatus(!result.error && result.data.session ? "ready" : "invalid");
      } catch {
        setStatus("invalid");
      }
    }
    void verify();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "ready" || busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirm")) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { supabase } = await import("@/lib/supabase");
      if (inviteHash.current) {
        const verification = await supabase.auth.verifyOtp({ token_hash: inviteHash.current, type: "invite" });
        if (verification.error || !verification.data.session) {
          setError("The invitation could not be verified. Try again or ask for a fresh invitation.");
          return;
        }
        invitedUser.current = verification.data.session.user.id;
        inviteHash.current = null;
      }
      const current = await supabase.auth.getUser();
      if (current.error || !invitedUser.current || current.data.user?.id !== invitedUser.current) {
        setStatus("invalid");
        return;
      }
      const result = await supabase.auth.updateUser({ password });
      if (result.error) {
        setError("Your password could not be saved. Try a stronger password or ask your administrator for a fresh invitation.");
        return;
      }
      setStatus("saved");
    } catch {
      setError("The connection dropped. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-2 w-full rounded-lg border border-slate-400 bg-white px-3 py-3 text-slate-950";
  return (
    <main className="grid min-h-screen place-items-center bg-[#2E1252] px-5 py-12">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 text-slate-950 shadow-xl sm:p-9">
        <p className="text-sm font-bold text-[#2E1252]">Heartbeat of God · Pulse OS</p>
        <h1 className="mt-3 font-headline text-3xl">Set up your staff login</h1>
        {status === "checking" && <p className="mt-4" role="status">Checking your invitation…</p>}
        {status === "invalid" && <p className="mt-4" role="alert">This invitation is invalid, expired, or already used. Ask your HBG administrator for a new invitation.</p>}
        {status === "saved" && <p className="mt-4" role="status">Your password is set. You can sign in once your administrator assigns your staff role.</p>}
        {status === "ready" && (
          <form onSubmit={save} className="mt-5 space-y-4">
            <label className="block font-semibold">New password
              <input className={input} name="password" type="password" autoComplete="new-password" minLength={12} required />
            </label>
            <label className="block font-semibold">Confirm new password
              <input className={input} name="confirm" type="password" autoComplete="new-password" minLength={12} required />
            </label>
            <p className="text-sm">Use at least 12 characters.</p>
            {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
            <button disabled={busy} className="min-h-11 w-full rounded-lg bg-[#2E1252] px-4 text-white disabled:opacity-60">
              {busy ? "Saving…" : "Save password"}
            </button>
          </form>
        )}
        {status !== "ready" && status !== "checking" && <Link className="mt-5 inline-block font-semibold text-[#2E1252] underline" href="/login">Go to sign-in</Link>}
      </section>
    </main>
  );
}
