"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

type Assignment = {
  user_id: string; display_name: string; responsibility: string;
  assignment: string; review_on: string; active: boolean;
};
const input = "mt-1 min-h-11 w-full rounded-xl border border-purple-200 bg-white p-3";
export default function PastorateAccess() {
  const [lead, setLead] = useState(false);
  const [rows, setRows] = useState<Assignment[]>([]);
  const [message, setMessage] = useState("Loading assignments…");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [permission, assignments] = await Promise.all([
      supabase.rpc("pastorate_is_lead"),
      supabase.from("pastorate_assignments").select("*").order("display_name"),
    ]);
    if (permission.error || assignments.error) {
      setMessage("Pastorate access could not load. Refresh or contact the Lead Pastor.");
      return;
    }
    setLead(Boolean(permission.data));
    setRows(assignments.data ?? []);
    setMessage("");
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function assign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      const account = await supabase.rpc("pastorate_find_account", { p_email: data.get("email") });
      if (account.error) throw account.error;
      const identity = await supabase.auth.getUser();
      if (!identity.data.user) throw new Error("Please sign in again.");
      const result = await supabase.from("pastorate_assignments").upsert({
        user_id: account.data, display_name: String(data.get("name")).trim(),
        responsibility: String(data.get("responsibility")).trim(),
        assignment: String(data.get("assignment")).trim(), review_on: data.get("review"),
        active: true, approved_by: identity.data.user.id,
      }, { onConflict: "user_id" });
      if (result.error) throw result.error;
      form.reset();
      await load();
      setMessage("Assignment saved. The pastor can open My pastoral assignments with their own login.");
    } catch { setMessage("Assignment could not be saved. Check the existing login email, your access and connection."); }
    finally { setBusy(false); }
  }
  async function revoke(userId: string) {
    setBusy(true);
    const result = await supabase.from("pastorate_assignments").update({ active: false }).eq("user_id", userId).select("user_id");
    if (result.error || result.data?.length !== 1) setMessage("Access revocation could not be confirmed.");
    else { await load(); setMessage("Pastorate access revoked."); }
    setBusy(false);
  }
  return <section className="rounded-2xl border border-purple-100 bg-white p-6">
    <h2 className="text-xl font-semibold">{lead ? "Pastoral access and assignments" : "My pastoral assignments"}</h2>
    <p role="status" className="my-3">{message}</p>
    {lead && <form onSubmit={assign} className="grid gap-4">
      <p className="text-sm text-slate-600">Use an existing Pulse OS login email. Saving the same account replaces its pastoral assignment. Access applies to the pastor’s own assignment and the service rehearsal guide. Enrol pastoral training separately through Training.</p>
      <label>Pastor’s name<input name="name" required maxLength={160} className={input}/></label>
      <label>Existing login email<input name="email" type="email" required className={input}/></label>
      <label>Responsibility<input name="responsibility" required minLength={3} maxLength={160} placeholder="Assistant Pastor, Field Pastor or Welfare" className={input}/></label>
      <label>Assignment and authority limits<textarea name="assignment" required minLength={5} maxLength={2000} className={input}/></label>
      <label>Review date<input name="review" type="date" required className={input}/></label>
      <button disabled={busy} className="min-h-11 rounded-xl bg-purple-950 p-3 text-white">Approve pastoral assignment</button>
    </form>}
    {rows.map(row => <article key={row.user_id} className="mt-5 border-t pt-4">
      <h3 className="font-semibold">{row.display_name} · {row.responsibility}</h3>
      <p className="mt-2 whitespace-pre-wrap">{row.assignment}</p>
      <p className="mt-2 text-sm">Review {row.review_on} · {row.active ? "Active" : "Revoked"}</p>
      {lead && row.active && <button disabled={busy} onClick={() => void revoke(row.user_id)} className="mt-2 min-h-11 rounded-xl border px-4">Revoke Pastorate access</button>}
    </article>)}
    {!lead && rows.length === 0 && !message && <p>No active pastoral assignment is available for this account.</p>}
  </section>;
}
