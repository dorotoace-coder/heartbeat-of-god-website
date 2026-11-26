"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import styles from "./login.module.css";
import { supabase } from "@/lib/supabase";
import ForgotPassword from "@/components/auth/ForgotPassword";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
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
  return (
    <main id="main-content" className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Heartbeat of God home">
          <Image src="/hbg-logo-print.jpg" alt="Heartbeat of God" width={132} height={75} className={styles.logo} preload />
          <span className={styles.brandName}>HEARTBEAT<br />OF GOD</span>
        </Link>
        <Link href="/" className={styles.back}><ArrowLeft size={15} aria-hidden="true" /><span>Ministry website</span></Link>
      </header>

      <section className={styles.scene} aria-label="Heartbeat of God ministry">
        <div className={styles.artwork} aria-hidden="true">
          <Image src="/images/pulseos-hbg-sculpture.webp" alt="" fill sizes="(max-width: 850px) 100vw, 62vw" className={styles.sculpture} preload />
        </div>
        <div className={styles.sceneCopy}>
          <p className={styles.eyebrow}><span className={styles.dot} /> A REASON TO LIVE</p>
          <p className={styles.statement}>One heart.<br />One purpose.</p>
          <p className={styles.sceneNote}>A place to belong. A purpose to serve.</p>
        </div>
      </section>

      <section className={styles.signin} aria-labelledby="pulseos-title">
        <div className={styles.panel}>
          <p className={styles.eyebrow}>YOUR MINISTRY HOME</p>
          <h1 id="pulseos-title" className={styles.title}>HBG PulseOS<span className={styles.titleDot}>.</span></h1>
          <h2 className={styles.welcome}>{mode === "signin" ? "Welcome home." : "You belong here."}</h2>
          <p className={styles.intro}>{mode === "signin" ? "Sign in to connect, learn and serve." : "Create your account to begin."}</p>
          <form onSubmit={handleAuth} className={styles.form} aria-label={mode === "signin" ? "Sign in" : "Create an account"} aria-busy={loading}>
            {mode === "signup" && <label className={styles.label} htmlFor="full-name">Full name<input id="full-name" className={styles.field} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)} maxLength={160} disabled={loading} required /></label>}
            <label className={styles.label} htmlFor="email">Email address<input id="email" className={styles.field} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} disabled={loading} required /></label>
            <label className={styles.label} htmlFor="password">Password</label>
            <div className={styles.passwordField}>
              <input id="password" className={styles.field} type={showPassword ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={e=>setPassword(e.target.value)} minLength={mode === "signup" ? 6 : undefined} disabled={loading} required />
              <button type="button" className={styles.reveal} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} disabled={loading} onClick={()=>setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
            </div>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            {success && <p role="status" className={styles.success}>{success}</p>}
            <button disabled={loading} className={styles.submit}>{loading ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" />Please wait…</> : <>{mode === "signin" ? "Sign in" : "Create an account"}<ArrowRight size={18} aria-hidden="true" /></>}</button>
          </form>
          {mode === "signin" && <div className={styles.recovery}><ForgotPassword /></div>}
          <div className={styles.separator} />
          <p className={styles.switchPrompt}>{mode === "signin" ? "New to PulseOS?" : "Already part of PulseOS?"} <button type="button" disabled={loading} onClick={()=>{setMode(mode === "signin" ? "signup" : "signin");setShowPassword(false);setError("");setSuccess("");}} className={styles.switchMode}>{mode === "signin" ? "Create an account" : "Sign in"}<ArrowRight size={14} aria-hidden="true" /></button></p>
          <p className={styles.accessNote}>Everyone is welcome. Department tools open with an authorised assignment.</p>
        </div>
      </section>
      <footer className={styles.footer}><span>HEARTBEAT OF GOD</span><span>Faith. Community. Purpose.</span></footer>
    </main>
  );
}
