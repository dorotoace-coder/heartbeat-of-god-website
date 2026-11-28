"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { boardLanes, filterFollowups, followupLane, ministryToday, type FollowupSource } from "@/lib/followup/board";
import OutreachFollowupCard, { type OutreachFollowup, type OutreachWorker } from "./OutreachFollowupCard";

import ProgramDirectory, { type ChosenContact } from "./ProgramDirectory";

const fields = "id,full_name,phone,address,followup_date,assigned_to,completed_at,closure_outcome";
const requestFields = "id,full_name,phone,followup_date,assigned_to,completed_at,closure_outcome,kind";
const field = "mt-1 block min-h-11 w-full rounded-lg border border-purple-200 bg-white p-2";
export default function FollowupBoard() {
  const [selected, setSelected] = useState<{ contact: ChosenContact; selection: number } | null>(null);
  const [items, setItems] = useState<OutreachFollowup[]>([]);
  const [workers, setWorkers] = useState<OutreachWorker[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [pastor, setPastor] = useState(false);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<"all" | FollowupSource>("all");
  const [assignment, setAssignment] = useState<"all" | "mine" | "unassigned">("all");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState<{ id: string; signature: string } | null>(null);
  const [today, setToday] = useState(ministryToday);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(ministryToday()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [identity, access, team, outreach, requests, closedOutreach, closedRequests] = await Promise.all([
          supabase.auth.getUser(), supabase.rpc("staff_workspace"),
          supabase.from("outreach_workers").select("user_id,full_name").order("full_name"),
          supabase.from("outreach_contacts").select(fields).not("followup_date", "is", null).is("completed_at", null).order("followup_date").limit(500),
          supabase.from("ministry_followup_requests").select(requestFields).is("completed_at", null).order("followup_date").limit(500),
          supabase.from("outreach_contacts").select(fields).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(100),
          supabase.from("ministry_followup_requests").select(requestFields).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(100),
        ]);
        if (!active) return;
        if (identity.error || !identity.data.user || access.error || !["pastor", "evangelism"].includes(access.data) || team.error || outreach.error || requests.error || closedOutreach.error || closedRequests.error) {
          setError("The follow-up board could not load. Check access and setup, then retry.");
          setItems([]); return;
        }
        setUserId(identity.data.user.id); setPastor(access.data === "pastor");
        setWorkers(team.data ?? []);
        setItems([...[...(outreach.data ?? []), ...(closedOutreach.data ?? [])].map(item => ({ ...item, source: "outreach" as const })),
          ...[...(requests.data ?? []), ...(closedRequests.data ?? [])].map(({ kind, ...item }) => ({ ...item, address: null, source: kind as FollowupSource }))]);
        setError("");
      } catch { if (active) { setItems([]); setError("The follow-up board could not load. Retry when connected."); } }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [revision]);
  function refresh() { setLoading(true); setRevision(value => value + 1); }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading || error) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      p_name: String(data.get("name") ?? "").trim(), p_phone: String(data.get("phone") ?? "").trim() || null,
      p_kind: String(data.get("kind")), p_due: String(data.get("due")),
      p_worker: pastor ? String(data.get("worker") ?? "") || null : userId,
      p_permission: data.has("permission"),
    };
    const signature = JSON.stringify(payload);
    if (attempt && attempt.signature !== signature) { setMessage("Previous save unverified. Retry the same details or reload before changing them."); return; }
    const request = attempt ?? { id: crypto.randomUUID(), signature };
    setAttempt(request); setSaving(true); setMessage("");
    try {
      const result = await supabase.rpc("create_ministry_followup", { p_id: request.id, ...payload });
      if (result.error) {
        if (result.status >= 400 && result.status < 500 && ![408, 409, 429].includes(result.status)) setAttempt(null);
        setMessage("Save not confirmed. Check permission, date and worker, then retry."); return;
      }
      setAttempt(null); form.reset(); setSelected(null); setMessage("Follow-up created."); refresh();
    } catch { setMessage("Save unverified. Retry the same details before changing them."); }
    finally { setSaving(false); }
  }
  function chooseContact(contact: ChosenContact) {
    if (saving) return;
    // Every choice remounts the form, so permission must be confirmed again for this person.
    setSelected(previous => ({ contact, selection: (previous?.selection ?? 0) + 1 }));
    setMessage(attempt ? "The previous save was not confirmed. Check the board before entering it again." : "");
    setAttempt(null);
    document.getElementById("followup-create")?.scrollIntoView({ behavior: "smooth" });
  }
  const visible = filterFollowups(items, { search, source, assignment, userId });
  return <section className="space-y-6 text-slate-950">
    <header className="rounded-2xl bg-[#2e1252] p-6 text-white">
      <h1 className="font-serif text-3xl">Visitor &amp; ministry follow-up</h1>
      <p className="mt-2 text-sm text-purple-100">See who needs a conversation, who is responsible, and the next contact date.</p>
    </header>
    {pastor && <ProgramDirectory onChoose={chooseContact} />}
    <form id="followup-create" key={selected ? `selection-${selected.selection}` : "blank"} onSubmit={create} className="rounded-2xl border border-purple-100 bg-white p-5">
      <fieldset disabled={saving || loading || !!error} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-lg font-semibold">Add a follow-up</legend>
        <label>Full name<input name="name" defaultValue={selected?.contact.name ?? ""} className={field} required maxLength={160} /></label>
        <label>Reason<select name="kind" className={field}><option value="visitor">First-time visitor</option><option value="ministry">Ministry interest</option></select></label>
        <label>Phone (optional)<input name="phone" defaultValue={selected?.contact.phone ?? ""} type="tel" maxLength={80} className={field} /></label>
        <label>Next contact date<input name="due" type="date" min={today} required className={field} /></label>
        {pastor && <label>Assigned worker<select name="worker" className={field}><option value="">Unassigned</option>{workers.map(worker => <option key={worker.user_id} value={worker.user_id}>{worker.full_name}</option>)}</select></label>}
        <label className="flex items-center gap-2 sm:col-span-2"><input name="permission" type="checkbox" required /> This person agreed to follow-up and to share these details.</label>
        <button className="min-h-11 rounded-lg bg-purple-900 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Add follow-up"}</button>
      </fieldset>
      <p role="status" className="mt-3 text-sm">{message}</p>
    </form>
    <div className="grid gap-3 rounded-2xl bg-white p-5 sm:grid-cols-3">
      <label>Find a person<input type="search" value={search} onChange={event => setSearch(event.target.value)} className={field} /></label>
      <label>Source<select value={source} onChange={event => setSource(event.target.value as typeof source)} className={field}><option value="all">All sources</option><option value="visitor">Visitors</option><option value="ministry">Ministry interest</option><option value="outreach">Outreach</option></select></label>
      <label>Assignment<select value={assignment} onChange={event => setAssignment(event.target.value as typeof assignment)} className={field}><option value="all">All visible</option><option value="mine">Assigned to me</option>{pastor && <option value="unassigned">Unassigned</option>}</select></label>
      <p className="text-sm text-slate-600 sm:col-span-3">Dates use West Africa Time. Only records you can access are shown. Showing up to 500 open and 100 recently closed records per source. Search and counts apply to these loaded records.</p>
      <button type="button" disabled={loading} onClick={refresh} className="min-h-11 rounded-lg border border-purple-200 px-4 disabled:opacity-50">{loading ? "Loading…" : "Refresh board"}</button>
    </div>
    {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-900">{error}</p> : loading ? <p role="status">Loading follow-ups…</p> :
      <div className="grid items-start gap-4 xl:grid-cols-2">{boardLanes.map(lane => {
        const contacts = visible.filter(item => followupLane(item, today) === lane.id);
        return <section key={lane.id} aria-label={lane.label} className="rounded-2xl border border-purple-100 bg-purple-50/60 p-3 sm:p-4">
          <h2 className="mb-4 text-lg font-semibold">{lane.label} <span className="rounded-full bg-white px-2 py-1 text-sm">{contacts.length}</span></h2>
          {!contacts.length && <p className="p-3 text-sm text-slate-600">No matching follow-ups.</p>}
          <div className="space-y-3">{contacts.map(contact => <div key={`${contact.source}:${contact.id}`}>
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-purple-800">{contact.source === "visitor" ? "Visitor" : contact.source === "ministry" ? "Ministry interest" : "Outreach"}</p>
            <OutreachFollowupCard compact contact={contact} workers={workers} onSaved={refresh} />
          </div>)}</div>
        </section>;
      })}</div>}
  </section>;
}
