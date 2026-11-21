"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import ServiceSelector, { type PulseService } from "./ServiceSelector";

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

type Move = Counts & {
  id: string;
  from_date: string;
  from_time: string;
  to_date: string;
  to_time: string;
  reason: string;
  status: "moved" | "flagged" | "resolved";
  requested_by: string;
  requested_at: string;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
};

const input = "w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-slate-950";
const reportKey = (row: { service_date: string; service_time: string }) => `${row.service_date} ${row.service_time.slice(0, 5)}`;
const fromKey = (move: Move) => `${move.from_date} ${move.from_time.slice(0, 5)}`;
const toKey = (move: Move) => `${move.to_date} ${move.to_time.slice(0, 5)}`;
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

function MoveForm({ report, onDone, onCancel }: { report: Report; onDone: (message: string) => void; onCancel: () => void }) {
  const [destination, setDestination] = useState<PulseService | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [expected] = useState([report.men, report.women, report.children, report.first_timers]);
  const here = reportKey(report);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !destination) return;
    if (reason.trim().length < 5) return setNotice("Give a reason for the move.");
    setSaving(true);
    setNotice("");
    try {
      const { data, error } = await supabase.rpc("move_service_attendance", {
        p_from_date: report.service_date,
        p_from_time: report.service_time.slice(0, 5),
        p_to_date: destination.service_date,
        p_to_time: destination.service_time.slice(0, 5),
        p_expected: expected,
        p_reason: reason.trim(),
      });
      const there = `${destination.service_date} ${destination.service_time.slice(0, 5)}`;
      if (!error && data === "moved") return onDone(`Moved the ${here} report to ${there} (${destination.title}). The history is kept.`);
      if (!error && data === "flagged") return onDone(`Not moved: ${there} already has a report. Both reports are flagged for reconciliation. Compare them with paper, correct them as needed, then mark the flag reconciled.`);
      if (error?.code === "PT409") setNotice("This report changed since you opened it. Cancel and reopen it to see the latest counts.");
      else if (error?.code === "22023" || error?.code === "42501") setNotice(error.message);
      else setNotice("We could not confirm the move. Your choices are still here. Check your connection and retry.");
    } catch {
      setNotice("We could not confirm the move. Your choices are still here. Check your connection and retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-slate-300 p-4">
      <fieldset disabled={saving} className="space-y-3">
        <legend className="mb-2 font-bold">Move the {here} report</legend>
        <ServiceSelector label="Correct service" value={destination} onChange={setDestination}
          exclude={(service) => reportKey(service) === here} />
        <label className="block text-sm font-semibold">Reason for the move
          <textarea className={input} required minLength={5} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button disabled={saving || !destination} className="min-h-11 rounded-lg bg-[#2E1252] px-4 font-semibold text-white disabled:opacity-60">
          {saving ? "Moving…" : "Move report"}
        </button>
        <button type="button" disabled={saving} onClick={onCancel} className="min-h-11 rounded-lg border border-slate-400 px-4">Cancel</button>
      </div>
      <p role="status">{notice}</p>
    </form>
  );
}

function ResolveForm({ flag, onDone }: { flag: Move; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (note.trim().length < 5) return setNotice("Describe how the reports were reconciled.");
    setSaving(true);
    setNotice("");
    try {
      const { error } = await supabase.rpc("resolve_attendance_flag", { p_id: flag.id, p_resolution: note.trim() });
      if (!error) return onDone();
      setNotice(error.code === "22023" || error.code === "42501" ? error.message
        : "We could not confirm this. Check your connection and retry.");
    } catch {
      setNotice("We could not confirm this. Check your connection and retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2">
      <label className="block text-sm font-semibold">How the reports were reconciled
        <textarea className={input} required minLength={5} maxLength={500} value={note} disabled={saving} onChange={(event) => setNote(event.target.value)} />
      </label>
      <button disabled={saving} className="min-h-11 rounded-lg border border-[#2E1252] px-4 text-sm font-semibold text-[#2E1252] disabled:opacity-60">
        {saving ? "Saving…" : "Mark flag reconciled"}
      </button>
      <p role="status" className="text-sm">{notice}</p>
    </form>
  );
}

export default function AttendanceReports({ version, canCorrect }: { version: number; canCorrect: boolean }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{ key: string; mode: "correct" | "move" }>();
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
      const moved = await supabase.from("service_attendance_moves")
        .select("id,from_date,from_time,to_date,to_time,men,women,children,first_timers,reason,status,requested_by,requested_at,resolution,resolved_by,resolved_at")
        .order("requested_at", { ascending: true }).limit(200);
      if (cancelled) return;
      if (moved.error) return setError("Move history could not load. Refresh the page to retry.");
      const ids = [...new Set([
        ...history.data.map((row) => row.corrected_by),
        ...moved.data.flatMap((row) => [row.requested_by, row.resolved_by].filter(Boolean)),
      ])];
      const people = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [], error: null };
      if (cancelled) return;
      setNames(Object.fromEntries((people.data ?? []).map((person) => [person.id, person.full_name ?? "Service lead"])));
      setCorrections(history.data);
      setMoves(moved.data);
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
          const arrivals = moves.filter((move) => move.status === "moved" && toKey(move) === key);
          const flags = moves.filter((move) => move.status !== "moved" && (fromKey(move) === key || toKey(move) === key));
          const open = flags.some((flag) => flag.status === "flagged");
          const original = history[0] && {
            men: history[0].previous_men, women: history[0].previous_women,
            children: history[0].previous_children, first_timers: history[0].previous_first_timers,
          };
          return (
            <li key={key} className="space-y-1 py-3">
              <p className="font-semibold">{report.service_date} · {report.service_time.slice(0, 5)} WAT
                {history.length > 0 && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-950">Corrected</span>}
                {arrivals.length > 0 && <span className="ml-2 rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-950">Moved</span>}
                {open && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-950">Flagged for reconciliation</span>}
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
              {arrivals.map((move) => (
                <p key={move.id} className="text-sm">
                  Moved here from {fromKey(move)} WAT on {lagosTime.format(new Date(move.requested_at))} WAT by {names[move.requested_by] ?? "Service lead"}. Reason: {move.reason}
                </p>
              ))}
              {flags.map((flag) => (
                <div key={flag.id} className={`rounded-lg p-2 text-sm ${flag.status === "flagged" ? "bg-red-50 text-red-950" : "bg-slate-50"}`}>
                  <p>
                    {lagosTime.format(new Date(flag.requested_at))} WAT · {names[flag.requested_by] ?? "Service lead"} asked to move the {fromKey(flag)} report
                    {" "}(<Breakdown counts={flag} />) to {toKey(flag)}, which already had a report. Not moved. Reason: {flag.reason}
                  </p>
                  {flag.status === "resolved" && flag.resolved_at && (
                    <p className="mt-1">Reconciled {lagosTime.format(new Date(flag.resolved_at))} WAT by {names[flag.resolved_by ?? ""] ?? "Service lead"}: {flag.resolution}</p>
                  )}
                  {flag.status === "flagged" && canCorrect && fromKey(flag) === key && (
                    <ResolveForm flag={flag} onDone={() => {
                      setNotice(`Flag for ${fromKey(flag)} marked reconciled.`);
                      setReload((current) => current + 1);
                    }} />
                  )}
                </div>
              ))}
              {canCorrect && editing?.key !== key && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setEditing({ key, mode: "correct" }); setNotice(""); }}
                    className="min-h-11 rounded-lg border border-[#2E1252] px-4 text-sm font-semibold text-[#2E1252]">
                    Correct this report
                  </button>
                  <button type="button" onClick={() => { setEditing({ key, mode: "move" }); setNotice(""); }}
                    className="min-h-11 rounded-lg border border-[#2E1252] px-4 text-sm font-semibold text-[#2E1252]">
                    Move to another service
                  </button>
                </div>
              )}
              {canCorrect && editing?.key === key && editing.mode === "correct" && (
                <CorrectionForm report={report} onCancel={() => setEditing(undefined)} onCorrected={() => {
                  setEditing(undefined);
                  setNotice(`Correction saved for ${key}. The original count is kept in the history.`);
                  setReload((current) => current + 1);
                }} />
              )}
              {canCorrect && editing?.key === key && editing.mode === "move" && (
                <MoveForm report={report} onCancel={() => setEditing(undefined)} onDone={(message) => {
                  setEditing(undefined);
                  setNotice(message);
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
