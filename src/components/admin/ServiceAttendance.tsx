"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

const fields = [
  ["men", "Men"],
  ["women", "Women"],
  ["children", "Children"],
  ["first_timers", "First-timers"],
] as const;
const columns = "service_date,service_time,men,women,children,first_timers";
type Counts = Record<(typeof fields)[number][0], number>;
type Report = Counts & { service_date: string; service_time: string };

export default function ServiceAttendance() {
  const [access, setAccess] = useState<boolean | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [counts, setCounts] = useState<Counts>({ men: 0, women: 0, children: 0, first_timers: 0 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const total = counts.men + counts.women + counts.children;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const permission = await supabase.from("service_attendance_access").select("can_submit").maybeSingle();
      if (cancelled) return;
      if (permission.error) {
        setError("Attendance could not load. Refresh the page or contact your administrator.");
        setAccess(false);
        return;
      }
      setAccess(Boolean(permission.data));
      setCanSubmit(permission.data?.can_submit ?? false);
      if (!permission.data) return;
      const recent = await supabase.from("service_attendance").select(columns)
        .order("service_date", { ascending: false }).order("service_time", { ascending: false }).limit(10);
      if (cancelled) return;
      if (recent.error) setError("Recent reports could not load. Refresh the page to retry.");
      else setReports(recent.data);
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setMessage("");
    setError("");
    if (counts.first_timers > total) {
      setError("First-timers must already be included in the total attendance.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const report = { ...counts, service_date: String(form.get("date")), service_time: String(form.get("time")) };
    setSaving(true);
    try {
      const result = await supabase.from("service_attendance").insert(report);
      if (result.error) {
        if (result.error.code !== "23505") throw result.error;
        const existing = await supabase.from("service_attendance").select(columns)
          .eq("service_date", report.service_date).eq("service_time", report.service_time).single();
        if (existing.error) throw existing.error;
        if (!fields.every(([key]) => existing.data[key] === report[key])) {
          setError("A different report already exists for this service. Ask the service lead to reconcile the counts.");
          return;
        }
      }
      setMessage(`Saved · ${report.service_date} at ${report.service_time} · ${total} attendees`);
      setReports((previous) => [report, ...previous.filter((row) =>
        row.service_date !== report.service_date || row.service_time.slice(0, 5) !== report.service_time)]
        .sort((a, b) => (b.service_date + b.service_time).localeCompare(a.service_date + a.service_time)).slice(0, 10));
    } catch {
      setError("We could not confirm the save. Your counts are still here. Check your connection and retry.");
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-slate-950";

  return (
    <section className="mx-auto max-w-3xl space-y-6 text-slate-950">
      <header className="rounded-2xl bg-[#2E1252] p-6 text-white sm:p-8">
        <p className="text-sm font-semibold text-[#FFC83D]">Akute · West Africa Time</p>
        <h1 className="mt-2 text-3xl font-bold">Service attendance</h1>
        <p className="mt-2 text-white/90">Record one headcount per service.</p>
      </header>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-900">{error}</p>}
      {access === null && <p role="status">Checking attendance access…</p>}
      {access === false && !error && <p className="rounded-lg bg-white p-4">Ask your administrator for attendance access.</p>}
      {canSubmit && (
        <form onSubmit={save} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <fieldset disabled={saving} className="grid grid-cols-2 gap-4">
            <legend className="mb-4 text-lg font-bold">Service details and headcount</legend>
            <label className="min-w-0 text-sm font-semibold">Date<input className={input} name="date" type="date" required /></label>
            <label className="min-w-0 text-sm font-semibold">Start time<input className={input} name="time" type="time" required /></label>
            {fields.map(([key, label]) => (
              <label key={key} className="text-sm font-semibold">{label}
                <input className={input} type="number" inputMode="numeric" min="0" max="100000" required
                  value={counts[key]} onChange={(event) => setCounts({ ...counts, [key]: Number(event.target.value) })} />
              </label>
            ))}
          </fieldset>
          <p className="text-sm">Include first-timers in the men, women, or children counts above.</p>
          <p className="font-bold">Total attendance: {total}</p>
          <button disabled={saving} className="min-h-11 rounded-lg bg-[#2E1252] px-5 py-2 font-semibold text-white disabled:opacity-60">
            {saving ? "Saving…" : "Submit attendance"}
          </button>
          <p role="status" aria-live="polite">{message}</p>
        </form>
      )}
      {access && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold">Recent reports</h2>
          {reports.length === 0 && !error && <p className="mt-3">No reports yet.</p>}
          <ul className="divide-y divide-slate-200">
            {reports.map((report) => <li key={report.service_date + report.service_time} className="py-3">
              <p className="font-semibold">{report.service_date} · {report.service_time.slice(0, 5)}</p>
              <p className="text-sm">{report.men + report.women + report.children} attendees · {report.first_timers} first-timers</p>
            </li>)}
          </ul>
        </section>
      )}
    </section>
  );
}
