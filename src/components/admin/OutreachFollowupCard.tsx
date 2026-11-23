"use client";

import { useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export type OutreachWorker = { user_id: string; full_name: string };
export type OutreachFollowup = {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  followup_date: string;
  assigned_to: string | null;
  source?: "outreach" | "visitor" | "ministry";
  completed_at: string | null;
  closure_outcome: "completed" | "declined" | null;
};
type Outcome = "no_answer" | "conversation" | "completed" | "declined" | "handoff";
type Event = { id: string; outcome: Outcome; note: string; occurred_at: string; next_due: string | null; actor_id: string; assigned_to: string | null };

const outcomeLabels: Record<Outcome, string> = {
  no_answer: "No answer",
  conversation: "Had a conversation",
  completed: "Follow-up complete",
  declined: "Asked for no further contact",
  handoff: "Handed over",
};
const field = "block min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2";

export default function OutreachFollowupCard({ contact, workers, onSaved, compact = false }: {
  contact: OutreachFollowup;
  workers: OutreachWorker[];
  onSaved: () => void;
  compact?: boolean;
}) {
  const [outcome, setOutcome] = useState<Outcome>("conversation");
  const [note, setNote] = useState("");
  const [nextDue, setNextDue] = useState(contact.followup_date);
  const [worker, setWorker] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Event[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const attempt = useRef<{ id: string; signature: string } | null>(null);
  const closed = !!contact.completed_at;
  const nextRequired = !["completed", "declined"].includes(outcome);

  async function toggleHistory() {
    if (historyOpen) { setHistoryOpen(false); return; }
    setHistoryOpen(true);
    setHistoryError(false);
    if (history) return;
    const result = await supabase.from(contact.source && contact.source !== "outreach" ? "ministry_followup_events" : "outreach_followup_events")
      .select("id,outcome,note,occurred_at,next_due,actor_id,assigned_to")
      .eq("contact_id", contact.id).order("occurred_at", { ascending: false }).limit(100);
    setHistoryError(!!result.error);
    if (!result.error) setHistory(result.data as Event[]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanNote = note.trim();
    const due = nextRequired ? nextDue : null;
    const assignee = outcome === "handoff" ? worker : null;
    if (!cleanNote || cleanNote.length > 500 || (nextRequired && !due) || (outcome === "handoff" && !assignee)) {
      setMessage("Add a short note and the required next step."); return;
    }
    const signature = JSON.stringify({ contact: contact.id, outcome, note: cleanNote, due, assignee });
    if (attempt.current && attempt.current.signature !== signature) {
      setMessage("The previous save is unverified. Retry the same details or refresh this page first."); return;
    }
    attempt.current ??= { id: crypto.randomUUID(), signature };
    setBusy(true);
    setMessage("");
    try {
      const result = await supabase.rpc(contact.source && contact.source !== "outreach" ? "record_ministry_followup" : "record_outreach_followup", {
        p_id: attempt.current.id, p_contact: contact.id, p_outcome: outcome,
        p_note: cleanNote, p_next_due: due, p_worker: assignee,
      });
      if (result.error) {
        if (result.status >= 400 && result.status < 500 && ![408, 409, 429].includes(result.status)) attempt.current = null;
        setMessage("The follow-up was not confirmed. Check the date and access, then retry.");
        return;
      }
      attempt.current = null;
      setNote("");
      setHistory(null);
      setHistoryOpen(false);
      setMessage("Follow-up saved.");
      onSaved();
    } catch {
      setMessage("Save unverified. Retry the same details before changing them.");
    } finally { setBusy(false); }
  }

  const assigneeName = workers.find(person => person.user_id === contact.assigned_to)?.full_name ?? (contact.assigned_to ? "a worker" : "Unassigned");
  const followupForm = <form onSubmit={save} className="mt-4 grid gap-3 border-t border-purple-100 pt-4">
      <label>What happened?
        <select className={field} value={outcome} onChange={event => setOutcome(event.target.value as Outcome)} disabled={busy}>
          {Object.entries(outcomeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>Brief handoff note
        <textarea className="block min-h-24 w-full rounded-lg border border-slate-300 p-2" value={note} onChange={event => setNote(event.target.value)} maxLength={500} required disabled={busy} placeholder="What should the next worker know?" />
      </label>
      {nextRequired && <label>Next contact date<input className={field} type="date" value={nextDue} onChange={event => setNextDue(event.target.value)} required disabled={busy} /></label>}
      {outcome === "handoff" && <label>Next worker
        <select className={field} value={worker} onChange={event => setWorker(event.target.value)} required disabled={busy}>
          <option value="">Choose a worker</option>
          {workers.filter(person => person.user_id !== contact.assigned_to).map(person => <option key={person.user_id} value={person.user_id}>{person.full_name}</option>)}
        </select>
      </label>}
      <button disabled={busy} className="min-h-11 rounded-lg bg-[#2e1252] px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save follow-up"}</button>
      <p role="status" className="text-sm">{message}</p>
    </form>;
  return <article className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><h4 className="font-semibold text-[#2e1252]">{contact.full_name}</h4>
        <p className="text-sm text-slate-600">{closed ? contact.closure_outcome === "declined" ? "Asked for no further contact" : "Follow-up completed" : `Next contact ${contact.followup_date}`} · {contact.assigned_to ? `Assigned to ${assigneeName}` : "Unassigned"}</p></div>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${contact.closure_outcome === "declined" ? "bg-red-50 text-red-900" : closed ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-900"}`}>
        {contact.closure_outcome === "declined" ? "Do not contact" : closed ? "Closed" : "Open"}
      </span>
    </div>
    {contact.phone && <p className="mt-2 break-all text-sm">{contact.phone}</p>}
    {contact.address && <p className="mt-1 text-sm">{contact.address}</p>}
    {compact && !closed ? <details className="mt-4"><summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-purple-900">Record a contact or handoff</summary>{followupForm}</details> : !closed ? followupForm : null}
    <button type="button" onClick={() => void toggleHistory()} className="mt-4 min-h-11 text-sm font-semibold text-purple-900 underline">
      {historyOpen ? "Hide history" : "View follow-up history"}
    </button>
    {historyOpen && <div className="mt-2 rounded-xl bg-purple-50 p-4 text-sm">
      {historyError ? <p role="alert">History could not load. Close and reopen to retry.</p> : history === null ? <p role="status">Loading history…</p> :
        history.length === 0 ? <p>No contact attempts have been recorded yet.</p> :
        <ol className="space-y-3">{history.map(item => <li key={item.id} className="border-b border-purple-100 pb-3 last:border-0 last:pb-0">
          <p className="font-semibold">{outcomeLabels[item.outcome]} · {new Date(item.occurred_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
          <p className="whitespace-pre-wrap">{item.note}</p>
          {item.next_due && <p>Next date: {item.next_due}</p>}
          {item.assigned_to && <p>Handed to {workers.find(person => person.user_id === item.assigned_to)?.full_name ?? "another worker"}</p>}
        </li>)}</ol>}
      {history && history.length === 100 && <p className="mt-3 text-xs">Showing the 100 most recent entries.</p>}
      <p className="mt-3 text-xs text-slate-600">Times use your device time zone. Keep these notes factual and respectful.</p>
    </div>}
  </article>;
}
