"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { inviteProblem, roleAccess, roleLabel } from "@/lib/people/invitations";

type Offer = { display_name: string; role: string; details: Record<string, string>; expires_at: string; status: string; email_matches: boolean };
const button = "min-h-11 rounded-lg px-4 font-semibold disabled:opacity-50";

/** The page an invitation email opens. Access starts only when the invited person accepts. */
export default function InvitationAccept({ token }: { token: string }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [problem, setProblem] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  useEffect(() => {
    let active = true;
    void supabase.rpc("staff_invite_preview", { p_token: token }).then(result => {
      if (!active) return;
      if (result.error) { setProblem(inviteProblem(result.error.code, "This invitation could not be opened. Refresh and try again.")); return; }
      setOffer((result.data ?? [])[0] ?? null);
      if (!(result.data ?? []).length) setProblem(inviteProblem("HB033"));
    });
    return () => { active = false; };
  }, [token]);

  async function accept() {
    setBusy(true); setProblem("");
    try {
      const result = await supabase.rpc("staff_invite_accept", { p_token: token });
      if (result.error) setProblem(inviteProblem(result.error.code, "Not accepted. Check your connection and try again."));
      else setAccepted(true);
    } catch { setProblem("Not accepted. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  async function savePassword() {
    setPasswordMessage("");
    const result = await supabase.auth.updateUser({ password });
    setPasswordMessage(result.error ? "Password not saved. Use at least 8 characters and try again." : "Password saved. Use it to sign in next time.");
    if (!result.error) setPassword("");
  }

  const when = (value: string) => new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  return <main id="main-content" className="mx-auto max-w-xl space-y-5 p-4 text-slate-950 sm:p-8">
    <h1 className="font-serif text-3xl text-[#2e1252]">Staff invitation</h1>
    {!offer && !problem && <p role="status">Opening your invitation…</p>}
    {offer && <section className="space-y-3 rounded-2xl border border-purple-100 bg-white p-5">
      <p>You have been invited to serve as <span className="font-semibold">{roleLabel(offer.role)}</span>.</p>
      <p><span className="font-semibold">You will be able to: </span>{roleAccess(offer.role)}</p>
      {offer.role === "pastorate" && <div className="rounded-lg bg-purple-50 p-3 text-sm">
        <p className="font-semibold">{offer.details.responsibility}</p>
        <p className="mt-1 whitespace-pre-wrap">{offer.details.assignment}</p>
        <p className="mt-1">Review {offer.details.review_on}</p>
      </div>}
      {accepted ? <p role="status" className="font-semibold text-emerald-800">Accepted. Your access is ready. <a className="underline" href="/admin">Open my workspace</a></p>
        : offer.status !== "open" ? <p className="text-amber-900">{inviteProblem("HB039")}</p>
        : !offer.email_matches ? <p className="text-amber-900">{inviteProblem("HB034")} You can sign out and sign in again with that address.</p>
        : <>
          <p className="text-sm text-slate-600">Accept before {when(offer.expires_at)}. Accepting does not sign you up for any messages.</p>
          <button type="button" disabled={busy} onClick={() => void accept()} className={`${button} bg-purple-900 text-white`}>{busy ? "Accepting…" : "Accept invitation"}</button>
        </>}
    </section>}
    {problem && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-amber-900">{problem}</p>}
    <section className="space-y-2 rounded-2xl border border-purple-100 bg-white p-5 text-sm">
      <h2 className="font-semibold">New to Pulse OS?</h2>
      <p>If you opened this from an invitation email, set a password now so you can sign in next time.</p>
      <label className="block">New password<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-purple-200 p-2" /></label>
      <button type="button" disabled={password.length < 8} onClick={() => void savePassword()} className={`${button} border border-purple-200`}>Save password</button>
      {passwordMessage && <p role="status">{passwordMessage}</p>}
    </section>
  </main>;
}
