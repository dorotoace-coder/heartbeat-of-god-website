"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { invitationRoles, invitationStatus, invitationStatusLabels, inviteProblem, roleAccess, roleDetails, roleLabel, type InvitationRow } from "@/lib/people/invitations";

const field = "mt-1 block min-h-11 w-full rounded-lg border border-purple-200 bg-white p-2";
const button = "min-h-11 rounded-lg border border-purple-200 bg-white px-4 disabled:opacity-50";

/** Reads the function's error body so the database's reason reaches the screen. */
async function functionProblem(error: unknown) {
  const context = (error as { context?: Response })?.context;
  try {
    const body = context ? await context.json() : null;
    if (body?.error === "send_failed") return "Saved, but the email could not be sent. Use Resend.";
    return inviteProblem(body?.code);
  } catch { return "Not sent. Check your connection and try again."; }
}

/** Owner-only: invite someone by email into one staff role. Access starts when they accept. */
export default function StaffInvitations() {
  const [rows, setRows] = useState<InvitationRow[] | null>(null);
  const [hidden, setHidden] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("");
  const [request, setRequest] = useState<string | null>(null);
  const load = useCallback(async () => {
    const result = await supabase.from("staff_invitations")
      .select("id,email,display_name,role,created_at,expires_at,sent_at,send_error,accepted_at,revoked_at")
      .order("created_at", { ascending: false }).limit(50);
    if (result.error) { setHidden(result.error.code === "42501"); setRows([]); return; }
    setRows(result.data ?? []);
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  if (hidden) return null;

  async function invoke(body: Record<string, unknown>, done: string) {
    setBusy(true); setMessage("");
    try {
      const result = await supabase.functions.invoke("staff-invite", { body });
      if (result.error) { setMessage(await functionProblem(result.error)); return false; }
      setMessage(done); return true;
    } catch { setMessage("Not sent. Check your connection and try again."); return false; }
    finally { setBusy(false); void load(); }
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const id = request ?? crypto.randomUUID();
    setRequest(id);
    const ok = await invoke({ action: "create", id, email: value("email"), name: value("name"), role,
      details: roleDetails(role, { trainedOn: value("trained_on"), responsibility: value("responsibility"), assignment: value("assignment"), reviewOn: value("review_on") }) },
      "Invitation sent. Access starts only when they accept with that email address.");
    if (ok) { form.reset(); setRole(""); setRequest(null); }
    else setRequest(null);
  }

  async function revoke(id: string) {
    setBusy(true); setMessage("");
    const result = await supabase.rpc("staff_invite_revoke", { p_id: id });
    setMessage(result.error ? inviteProblem(result.error.code) : "Invitation withdrawn. The link no longer works.");
    setBusy(false); void load();
  }

  return <section className="space-y-4 rounded-2xl border border-purple-100 bg-white p-6 text-slate-950">
    <h2 className="text-xl font-semibold">Staff invitations</h2>
    <p className="text-sm text-slate-600">Invite someone by email into one staff role. Access goes to whoever owns that email address; the name you type is only a label. The link works only for that address, once, for 7 days. Treasury and administrator access are never given by invitation.</p>
    <form onSubmit={invite} className="grid gap-3 sm:grid-cols-2">
      <fieldset disabled={busy} className="contents">
        <label>Their name<input name="name" required maxLength={160} className={field} /></label>
        <label>Their email address<input name="email" type="email" required maxLength={254} className={field} /></label>
        <label className="sm:col-span-2">Role<select required value={role} onChange={event => setRole(event.target.value)} className={field}>
          <option value="">Choose a role</option>{invitationRoles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        {role && <p className="rounded-lg bg-purple-50 p-3 text-sm sm:col-span-2"><span className="font-semibold">They will be able to: </span>{roleAccess(role)}</p>}
        {role === "foundation_teacher" && <label>Training completed<input name="trained_on" type="date" required className={field} /></label>}
        {role === "pastorate" && <>
          <label>Responsibility<input name="responsibility" required minLength={3} maxLength={160} placeholder="Assistant Pastor, Field Pastor or Welfare" className={field} /></label>
          <label>Review date<input name="review_on" type="date" required className={field} /></label>
          <label className="sm:col-span-2">Assignment and authority limits<textarea name="assignment" required minLength={5} maxLength={2000} className={field} /></label>
        </>}
        <button className="min-h-11 rounded-lg bg-purple-900 px-4 font-semibold text-white disabled:opacity-50 sm:col-span-2" disabled={!role}>{busy ? "Sending…" : "Send invitation"}</button>
      </fieldset>
    </form>
    <p role="status" className="text-sm">{message}</p>
    {rows && rows.length > 0 && <ul className="space-y-2">{rows.map(row => { const status = invitationStatus(row); return <li key={row.id} className="rounded-xl border border-purple-100 p-3 text-sm">
      <p className="font-semibold">{row.display_name} · {roleLabel(row.role)}</p>
      <p className="break-all">{row.email}</p>
      <p>{invitationStatusLabels[status]}{row.send_error && status !== "accepted" ? ` · last send failed` : ""}</p>
      {(status === "sent" || status === "not_sent" || status === "expired") && <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={button} onClick={() => void invoke({ action: "resend", id: row.id }, "Invitation sent again. The earlier link no longer works.")}>Resend</button>
        {status !== "expired" && <button type="button" disabled={busy} className={button} onClick={() => void revoke(row.id)}>Withdraw</button>}
      </div>}
    </li>; })}</ul>}
  </section>;
}
