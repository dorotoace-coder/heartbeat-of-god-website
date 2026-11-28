"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { LearnerRow } from "@/lib/training/content";

type Placement = { id: string; learner_id: string; stage: string; assignment: string; review_on: string; mentor_id: string; supervisor_id: string };
type Note = { id: string; placement_id: string; feedback?: string; next_step?: string; outcome?: string; created_at: string };
const field = "mt-1 min-h-11 w-full rounded-xl border border-purple-200 bg-white p-3";
export default function FormationRecords({ learners, isPastor, userId }: { learners: LearnerRow[]; isPastor: boolean; userId: string }) {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [reviews, setReviews] = useState<Note[]>([]);
  const [staff, setStaff] = useState<{ user_id: string; full_name: string }[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const [p, n, r] = await Promise.all([
      supabase.from("training_placements").select("*").order("created_at", { ascending: false }),
      supabase.from("training_observations").select("*").order("created_at"),
      supabase.from("training_formation_reviews").select("*").order("created_at"),
    ]);
    if (p.error || n.error || r.error) {
      setMessage("Formation records are unavailable. The local database update may still be pending.");
      return;
    }
    setPlacements(p.data ?? []); setNotes(n.data ?? []); setReviews(r.data ?? []);
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (isPastor) void supabase.rpc("pastor_staff_access").then(({ data, error }) => {
      if (error) setMessage("The staff directory could not load.");
      else setStaff(data ?? []);
    });
  }, [isPastor]);
  async function save(event: React.FormEvent<HTMLFormElement>, table: string, values: Record<string, unknown>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    try {
      const { error } = await supabase.from(table).insert(values);
      if (error) throw error;
      form.reset();
      setMessage("Saved.");
      await load();
    } catch { setMessage("The record could not be saved. Check your access and connection before retrying."); }
    finally { setBusy(false); }
  }
  return <details className="rounded-2xl border border-purple-200 bg-white p-6">
    <summary className="cursor-pointer text-xl font-semibold">Mentoring and supervised service</summary>
    <p className="mt-3 text-slate-600">Record service feedback suitable for the learner to read. Pastoral reviews identify the next step in training.</p>
    <p role="status" className="my-3">{message}</p>
    {isPastor && <form className="grid gap-4 md:grid-cols-2" onSubmit={e => {
      const f = new FormData(e.currentTarget);
      void save(e, "training_placements", Object.fromEntries(f.entries()));
    }}>
      <label>Learner<select name="learner_id" required className={field}><option value="">Choose learner</option>{learners.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.display_name}</option>)}</select></label>
      <label>Stage<select name="stage" className={field}>{["foundation", "discipleship", "minister", "deacon", "pastoral"].map(s => <option key={s}>{s}</option>)}</select></label>
      {["mentor_id", "supervisor_id"].map(name => <label key={name}>{name === "mentor_id" ? "Mentor" : "Service supervisor"}<select name={name} required className={field}><option value="">Choose staff member</option>{staff.map(s => <option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}</select></label>)}
      <label>Service assignment<textarea name="assignment" minLength={5} maxLength={1000} required className={field}/></label>
      <label>Review date<input name="review_on" type="date" required className={field}/></label>
      <button disabled={busy} className="min-h-11 rounded-xl bg-purple-950 p-3 text-white">Assign supervised service</button>
    </form>}
    {placements.map(p => <article key={p.id} className="mt-6 border-t pt-5">
      <h3 className="font-semibold">{learners.find(l => l.id === p.learner_id)?.display_name ?? "Assigned learner"} · {p.stage}</h3>
      <p className="mt-2">{p.assignment}</p><p className="text-sm text-slate-600">Review due {p.review_on}</p>
      {notes.filter(n => n.placement_id === p.id).map(n => <p key={n.id} className="mt-3">{n.feedback}</p>)}
      {reviews.filter(r => r.placement_id === p.id).map(r => <p key={r.id} className="mt-3 font-medium">{r.outcome?.replaceAll("_", " ")} · {r.next_step}</p>)}
      {(isPastor || p.mentor_id === userId || p.supervisor_id === userId) && <form className="mt-4" onSubmit={e => { const f = new FormData(e.currentTarget); void save(e, "training_observations", { placement_id: p.id, feedback: f.get("feedback") }); }}>
        <label>Observed service and feedback<textarea name="feedback" minLength={5} maxLength={2000} required className={field}/></label>
        <button disabled={busy} className="min-h-11 rounded-xl border p-3">Save observation</button>
      </form>}
      {isPastor && <form className="mt-4" onSubmit={e => { const f = new FormData(e.currentTarget); void save(e, "training_formation_reviews", { placement_id: p.id, outcome: f.get("outcome"), next_step: f.get("next_step") }); }}>
        <label>Pastoral review<select name="outcome" className={field}><option value="continue">Continue training</option><option value="further_preparation">Further preparation</option><option value="ready_for_consideration">Ready for pastoral consideration</option></select></label>
        <label>Agreed next step<textarea name="next_step" minLength={5} maxLength={2000} required className={field}/></label>
        <button disabled={busy} className="min-h-11 rounded-xl border p-3">Record pastoral review</button>
      </form>}
    </article>)}
    {!placements.length && <p className="mt-5">No supervised placements to display.</p>}
  </details>;
}
