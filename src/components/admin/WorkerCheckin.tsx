"use client";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { LearnerRow } from "@/lib/training/content";
import ServiceSelector, { type PulseService } from "./ServiceSelector";

const input = "mt-1 min-h-11 w-full rounded-xl border p-3";
export default function WorkerCheckin({ learners }: { learners: LearnerRow[] }) {
  const [service, setService] = useState<PulseService | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const localTime = String(values.get("arrival"));
    const arrived = new Date(service.service_date + "T" + localTime + ":00+01:00");
    if (!Number.isFinite(arrived.getTime())) {
      setMessage("Enter a valid arrival time.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("worker_service_checkins").upsert({
        learner_id: values.get("learner"),
        service_id: service.id,
        arrived_at: arrived.toISOString(),
        note: String(values.get("note")).trim(),
      }, { onConflict: "learner_id,service_id" });
      if (error) throw error;
      setMessage("Check-in saved. The time is recorded in Lagos time.");
      form.reset();
    } catch {
      setMessage("Check-in could not be confirmed. Your entries are available to retry.");
    } finally { setBusy(false); }
  }
  return <details className="rounded-2xl border border-purple-200 bg-white p-6">
    <summary className="cursor-pointer text-xl font-semibold">Worker service check-in</summary>
    <p className="my-3 text-slate-600">Mark a worker’s arrival for a scheduled service. Enter times in Lagos time. Saving the same worker and service updates that entry.</p>
    <form onSubmit={save} className="grid gap-4">
      <ServiceSelector value={service} onChange={setService} />
      <label>Worker<select required name="learner" className={input}><option value="">Choose an enrolled worker</option>{learners.filter(l => l.active).map(l => <option key={l.id} value={l.id}>{l.display_name}</option>)}</select></label>
      <label>Arrival time<input required type="time" name="arrival" className={input}/></label>
      <label>Explanation or correction note<input name="note" maxLength={500} className={input}/></label>
      <button disabled={busy || !service} className="min-h-11 rounded-xl bg-purple-950 p-3 text-white">Save worker check-in</button>
      <p role="status">{message}</p>
    </form>
  </details>;
}
