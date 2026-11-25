"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import ForgotPassword from "@/components/auth/ForgotPassword";

export default function ResetPassword() {
  const started = useRef(false);
  const recoveryHash = useRef<string | null>(null);
  const recoveringUser = useRef<string | null>(null);
  const [status, setStatus] = useState<"checking" | "invalid" | "ready" | "saved">("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Supabase can put the link details in the fragment or the query string.
    const params = new URLSearchParams(window.location.hash.slice(1));
    new URLSearchParams(window.location.search).forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
    window.history.replaceState(null, "", window.location.pathname);
    if (params.get("type") !== "recovery" || params.get("error")) {
      queueMicrotask(() => setStatus("invalid"));
      return;
    }
    const tokenHash = params.get("token_hash");
    if (tokenHash) {
      // Verify on form submission so an email scanner opening the link
      // does not use it up.
      recoveryHash.current = tokenHash;
      queueMicrotask(() => setStatus("ready"));
      return;
    }
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) {
      queueMicrotask(() => setStatus("invalid"));
      return;
    }
    async function verify() {
      try {
        const { supabase } = await import("@/lib/supabase");
        const result = await supabase.auth.setSession({ access_token: access_token!, refresh_token: refresh_token! });
        recoveringUser.current = result.data.session?.user.id ?? null;
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
      if (recoveryHash.current) {
        const verification = await supabase.auth.verifyOtp({ token_hash: recoveryHash.current, type: "recovery" });
        if (verification.error || !verification.data.session) {
          setStatus("invalid");
          return;
        }
        recoveringUser.current = verification.data.session.user.id;
        recoveryHash.current = null;
      }
      const current = await supabase.auth.getUser();
      if (current.error || !recoveringUser.current || current.data.user?.id !== recoveringUser.current) {
        setStatus("invalid");
        return;
      }
      const result = await supabase.auth.updateUser({ password });
      if (result.error) {
        setError("Your password could not be saved. Try a longer password that you haven't used here before.");
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
        <p className="text-sm font-bold text-[#2E1252]">Heartbeat of God</p>
        <h1 className="mt-3 font-headline text-3xl">Choose a new password</h1>
        {status === "checking" && <p className="mt-4" role="status">Checking your reset link…</p>}
        {status === "invalid" && (
          <div className="mt-4 space-y-4">
            <p role="alert">This reset link is invalid, expired, or already used. You can ask for a new one below.</p>
            <ForgotPassword />
          </div>
        )}
        {status === "saved" && (
          <div className="mt-4 space-y-4" role="status">
            <p>Your password has been changed, and you&apos;re signed in.</p>
            <div className="flex flex-wrap gap-4">
              <Link className="font-semibold text-[#2E1252] underline" href="/partnership">Go to the Partnership Centre</Link>
              <Link className="font-semibold text-[#2E1252] underline" href="/login">Staff sign-in</Link>
            </div>
          </div>
        )}
        {status === "ready" && (
          <form onSubmit={save} className="mt-5 space-y-4">
            <label className="block font-semibold">New password
              <input className={input} name="password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label className="block font-semibold">Confirm new password
              <input className={input} name="confirm" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <p className="text-sm">Use at least 8 characters.</p>
            {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
            <button disabled={busy} className="min-h-11 w-full rounded-lg bg-[#2E1252] px-4 text-white disabled:opacity-60">
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
