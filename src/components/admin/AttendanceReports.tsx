"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

export const attendanceFields = [
  ["men", "Men"],
  ["women", "Women"],
  ["children", "Children"],
  ["first_timers", "First-timers"],
] as const;
export type Counts = Record<(typeof attendanceFields)[number][0], number>;
type Report = Counts & { service_date: string; service_time: string };
type Correction = Counts & {
  id: string;
  service_date: string;
  service_time: string;
  previous_men: number;
  previous_women: number;
  previous_children: number;
  previous_first_timers: number;
  reason: string;
  corrected_by: string;
  corrected_at: string;
};

const input = "w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-slate-950";
const reportKey = (row: { service_date: string; service_time: string }) => `${row.service_date} ${row.service_time.slice(0, 5)}`;
const lagosTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });

function Breakdown({ counts }: { counts: Counts }) {
  return (
    <span>
      Men {counts.men} · Women {counts.women} · Children {counts.children} · Total {counts.men + counts.women + counts.children}
      {" "}· First-timers {counts.first_timers} (included in total)
    </span>
  );
}

function CorrectionForm({ report, onCorrected, onCancel }: { report: Report; onCorrected: () => void; onCancel: () => void }) {
  const [counts, setCounts] = useState<Counts>({ men: report.men, women: report.women, children: report.children, first_timers: report.first_timers });
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  // The counts this form was opened with; a retry keeps them so it stays safe.
  const [expected] = useState([report.men, report.women, report.children, report.first_timers]);
  const total = counts.men + counts.women + counts.children;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (reason.trim().length < 5) return setNotice("Give a reason for the correction.");
    if (counts.first_timers > total) return setNotice("First-timers must already be included in the total attendance.");
    setSaving(true);
    setNotice("");
    try {
      const { error } = await supabase.rpc("correct_service_attendance", {
        p_service_date: report.service_date,
        p_service_time: report.service_time.slice(0, 5),
        p_expected: expected,
        p_men: counts.men,
        p_women: counts.women,
        p_children: counts.children,
        p_first_timers: counts.first_timers,
        p_reason: reason.trim(),
      });
      if (!error) return onCorrected();
      if (error.code === "PT409") setNotice("This report changed since you opened it. Cancel and reopen it to see the latest counts.");
      else if (error.code === "22023" || error.code === "42501") setNotice(error.message);
      else setNotice("We could not confirm the correction. Your entries are still here. Check your connection and retry.");
    } catch {
      setNotice("We could not confirm the correction. Your entries are still here. Check your connection and retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-slate-300 p-4">
      <fieldset disabled={saving} className="grid grid-cols-2 gap-3">
        <legend className="mb-2 font-bold">Correct {reportKey(report)}</legend>
        {attendanceFields.map(([key, label]) => (
          <label key={key} className="text-sm font-semibold">{label}
            <input className={input} type="number" inputMode="numeric" min="0" max="100000" required
              value={counts[key]} onChange={(event) => setCounts({ ...counts, [key]: Number(event.target.value) })} />
          </label>
        ))}
        <label className="col-span-2 text-sm font-semibold">Reason for the correction
          <textarea className={input} required minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
      </fieldset>
      <p className="font-bold">Corrected total: {total}</p>
      <div className="flex flex-wrap gap-2">
        <button disabled={saving} className="min-h-11 rounded-lg bg-[#2E1252] px-4 font-semibold text-white disabled:opacity-60">
          {saving ? "Saving…" : "Save correction"}
        </button>
        <button type="button" disabled={saving} onClick={onCancel} className="min-h-11 rounded-lg border border-slate-400 px-4">Cancel</button>
      </div>
      <p role="status">{notice}</p>
    </form>
  );
}

export default function AttendanceReports({ version, canCorrect }: { version: number; canCorrect: boolean }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string>();
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const recent = await supabase.from("service_attendance").select("service_date,service_time,men,women,children,first_timers")
        .order("service_date", { ascending: false }).order("service_time", { ascending: false }).limit(10);
      if (cancelled) return;
      if (recent.error) return setError("Recent reports could not load. Refresh the page to retry.");
      const history = recent.data.length ? await supabase.from("service_attendance_corrections")
        .select("id,service_date,service_time,previous_men,previous_women,previous_children,previous_first_timers,men,women,children,first_timers,reason,corrected_by,corrected_at")
        .in("service_date", [...new Set(recent.data.map((row) => row.service_date))])
        .order("corrected_at", { ascending: true }) : { data: [], error: null };
      if (cancelled) return;
      if (history.error) return setError("Correction history could not load. Refresh the page to retry.");
      const ids = [...new Set(history.data.map((row) => row.corrected_by))];
      const people = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [], error: null };
      if (cancelled) return;
      setNames(Object.fromEntries((people.data ?? []).map((person) => [person.id, person.full_name ?? "Service lead"])));
      setCorrections(history.data);
      setReports(recent.data);
      setError("");
    }
    void load();
    return () => { cancelled = true; };
  }, [version, reload]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-lg font-bold">Recent reports</h2>
      {error && <p role="alert" className="mt-2 text-red-900">{error}</p>}
      <p role="status" className="mt-2 text-sm">{notice}</p>
      {reports === null && !error && <p className="mt-3">Loading reports…</p>}
      {reports?.length === 0 && <p className="mt-3">No reports yet.</p>}
      <ul className="divide-y divide-slate-200">
        {reports?.map((report) => {
          const key = reportKey(report);
          const history = corrections.filter((row) => reportKey(row) === key);
          const original = history[0] && {
            men: history[0].previous_men, women: history[0].previous_women,
            children: history[0].previous_children, first_timers: history[0].previous_first_timers,
          };
          return (
            <li key={key} className="space-y-1 py-3">
              <p className="font-semibold">{report.service_date} · {report.service_time.slice(0, 5)} WAT
                {history.length > 0 && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-950">Corrected</span>}
              </p>
              <p className="text-sm"><Breakdown counts={report} /></p>
              {original && (
                <details className="text-sm">
                  <summary className="cursor-pointer">Correction history ({history.length})</summary>
                  <p className="mt-1">Originally submitted: <Breakdown counts={original} /></p>
                  <ol className="mt-1 list-decimal space-y-1 pl-5">
                    {history.map((row) => (
                      <li key={row.id}>
                        {lagosTime.format(new Date(row.corrected_at))} WAT · {names[row.corrected_by] ?? "Service lead"}: changed to <Breakdown counts={row} />.
                        {" "}Reason: {row.reason}
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              {canCorrect && editing !== key && (
                <button type="button" onClick={() => { setEditing(key); setNotice(""); }}
                  className="min-h-11 rounded-lg border border-[#2E1252] px-4 text-sm font-semibold text-[#2E1252]">
                  Correct this report
                </button>
              )}
              {canCorrect && editing === key && (
                <CorrectionForm report={report} onCancel={() => setEditing(undefined)} onCorrected={() => {
                  setEditing(undefined);
                  setNotice(`Correction saved for ${key}. The original count is kept in the history.`);
                  setReload((current) => current + 1);
                }} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
