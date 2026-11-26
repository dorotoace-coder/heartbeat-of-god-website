"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ForgotPassword from "@/components/auth/ForgotPassword";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setError(""); setSuccess("");
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (mode === "signup" && !fullName.trim()) throw new Error("Please enter your full name.");
      const operation = mode === "signin" ? supabase.auth.signInWithPassword({ email: email.trim(), password }) :
        supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } });
      const result = await Promise.race([operation, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("We could not connect. Please try again.")), 15000);
      })]);
      if (result.error) throw result.error;
      if (mode === "signin" || result.data.session) router.push("/admin");
      else { setSuccess("Your account has been created. Check your email to confirm it, then sign in."); setMode("signin"); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "We could not complete that request. Please try again."); }
    finally { if (timer) clearTimeout(timer); setLoading(false); }
  }
  const field = "mt-2 min-h-12 w-full rounded-xl border border-purple-100 bg-purple-50/50 px-4 text-slate-950 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200";
  return <main id="main-content" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f2f7] px-4 py-10 text-slate-950">
    <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-purple-200/40 blur-3xl" />
    <div className="relative w-full max-w-md">
      <header className="mb-8 text-center">
        <Image src="/hbg-logo.png" alt="Heartbeat of God" width={100} height={82} className="mx-auto mb-4 h-20 w-auto mix-blend-multiply" priority />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-700">Heartbeat of God</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-purple-950">HBG PulseOS</h1>
        <p className="mt-3 text-slate-600">Welcome to your ministry home.</p>
      </header>
      <form onSubmit={handleAuth} className="space-y-5 rounded-3xl border border-white bg-white p-6 shadow-[0_10px_0_-5px_#e5dfec,0_25px_55px_-25px_rgba(46,18,82,0.35)] sm:p-8">
        <h2 className="text-xl font-semibold text-purple-950">{mode === "signin" ? "Sign in" : "Create an account"}</h2>
        {mode === "signup" && <label className="block text-sm font-medium">Full name<input className={field} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} maxLength={160} required /></label>}
        <label className="block text-sm font-medium">Email<input className={field} type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required /></label>
        <label className="block text-sm font-medium">Password<input className={field} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e=>setPassword(e.target.value)} minLength={mode === "signup" ? 6 : undefined} required /></label>
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
        {success && <p role="status" className="text-sm text-emerald-800">{success}</p>}
        <button disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple-950 px-4 font-semibold text-white shadow-[0_5px_0_#d9cce8] disabled:opacity-60">{loading ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" />Please wait…</> : mode === "signin" ? "Sign in" : "Create an account"}</button>
        <button type="button" disabled={loading} onClick={()=>{setMode(mode === "signin" ? "signup" : "signin");setError("");setSuccess("");}} className="min-h-11 w-full text-sm font-medium text-purple-800 underline underline-offset-4">{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
        {mode === "signin" && <div className="text-center"><ForgotPassword /></div>}
        <p className="text-xs leading-5 text-slate-500">Your account opens your ministry home. Department tools require an authorised assignment.</p>
      </form>
      <div className="mt-7 text-center"><Link href="/" className="inline-flex min-h-11 items-center text-sm text-purple-900 underline underline-offset-4">Back to the ministry website</Link></div>
    </div>
  </main>;
}
