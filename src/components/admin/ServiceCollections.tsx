"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import ServiceSelector, { type PulseService } from "./ServiceSelector";
import { label, money } from "./treasuryFormat";

type Entry = {
  id: string;
  category: string;
  amount: number;
  currency: string;
  method: string;
  confirmed_at: string | null;
  reverses_id: string | null;
  reversal_reason: string | null;
};

function subtotals(rows: Entry[]) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(row.currency, (totals.get(row.currency) ?? 0) + Number(row.amount));
  return [...totals].map(([currency, total]) => money(currency, total)).join(" · ");
}

function ReverseForm({ entry, onDone, onCancel }: { entry: Entry; onDone: (message: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (reason.trim().length < 5) return setNotice("Give a clear reason for the reversal.");
    setSaving(true);
    setNotice("");
    try {
      const result = await supabase.rpc("treasury_reverse_income", { p_id: entry.id, p_reason: reason.trim() });
      if (result.error) {
        // A reversal may have committed before its response was lost.
        const existing = await supabase.from("treasury_income").select("id").eq("reverses_id", entry.id).maybeSingle();
        if (existing.error || !existing.data) {
          setNotice(result.error.code === "P0001"
            ? `The reversal was refused: ${result.error.message}`
            : "The reversal is unverified. Keep this page open and retry.");
          return;
        }
      }
      onDone("Reversal posted. The other officer must confirm it before the confirmed total changes.");
    } catch {
      setNotice("The reversal is unverified. Keep this page open and retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2 rounded-xl border border-slate-300 p-3">
      <label className="block text-sm font-semibold">Reason for reversing {money(entry.currency, entry.amount)} · {label(entry.category)}
        <textarea required minLength={5} maxLength={500} value={reason} disabled={saving} onChange={(event) => setReason(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-slate-950" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button disabled={saving} className="min-h-11 rounded-lg bg-[#2E1252] px-4 font-semibold text-white disabled:opacity-60">
          {saving ? "Posting…" : "Post reversal"}
        </button>
        <button type="button" disabled={saving} onClick={onCancel} className="min-h-11 rounded-lg border border-slate-400 px-4">Cancel</button>
      </div>
      <p role="status" className="text-sm">{notice}</p>
    </form>
  );
}

export default function ServiceCollections({ refresh, onChanged }: { refresh: number; onChanged: () => void }) {
  const [service, setService] = useState<PulseService | null>(null);
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [error, setError] = useState(false);
  const [reversing, setReversing] = useState<string>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!service) return;
    let cancelled = false;
    async function load(id: string) {
      setRows(null);
      const result = await supabase.from("treasury_income")
        .select("id,category,amount,currency,method,confirmed_at,reverses_id,reversal_reason")
        .eq("pulse_service_id", id).order("created_at", { ascending: true }).limit(200);
      if (cancelled) return;
      setError(Boolean(result.error));
      setRows(result.error ? null : result.data);
    }
    void load(service.id);
    return () => { cancelled = true; };
  }, [service, refresh]);

  const byId = new Map(rows?.map((row) => [row.id, row]));
  const reversalOf = new Map(rows?.filter((row) => row.reverses_id).map((row) => [row.reverses_id as string, row]));
  const confirmed = rows?.filter((row) => row.confirmed_at) ?? [];
  const pending = rows?.filter((row) => !row.confirmed_at) ?? [];

  const item = (row: Entry) => {
    const original = row.reverses_id ? byId.get(row.reverses_id) : undefined;
    const reversal = reversalOf.get(row.id);
    return (
      <li key={row.id} id={`collection-${row.id}`} className="space-y-1 py-3">
        <p className="flex flex-wrap justify-between gap-2">
          <span className="font-semibold capitalize">{label(row.category)} · {label(row.method)} · {row.currency}</span>
          <span className="font-semibold tabular-nums">{money(row.currency, row.amount)}</span>
        </p>
        <p className="text-sm">{row.confirmed_at ? "Confirmed" : "Pending confirmation"}</p>
        {row.reverses_id && (
          <p className="text-sm">Reversal of{" "}
            {original ? <a className="underline" href={`#collection-${original.id}`}>{money(original.currency, original.amount)} · {label(original.category)}</a> : "an earlier entry"}
            {" "}· Reason: {row.reversal_reason}
          </p>
        )}
        {reversal && (
          <p className="text-sm">Reversed by <a className="underline" href={`#collection-${reversal.id}`}>a {reversal.confirmed_at ? "confirmed" : "pending"} reversal</a></p>
        )}
        {!row.reverses_id && !reversal && reversing !== row.id && (
          <button type="button" onClick={() => { setReversing(row.id); setMessage(""); }}
            className="min-h-11 rounded-lg border border-[#2E1252] px-4 text-sm font-semibold text-[#2E1252]">
            Reverse entry
          </button>
        )}
        {reversing === row.id && (
          <ReverseForm entry={row} onCancel={() => setReversing(undefined)} onDone={(text) => {
            setReversing(undefined);
            setMessage(text);
            onChanged();
          }} />
        )}
      </li>
    );
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 sm:p-7">
      <h2 className="text-lg font-bold">Collections by service</h2>
      <ServiceSelector value={service} onChange={setService} />
      <p role="status" className="text-sm">{message}</p>
      {error && <p role="alert">The collections for this service could not load. Refresh to try again.</p>}
      {service && rows === null && !error && <p>Loading collections…</p>}
      {rows && rows.length === 0 && <p>No collections are recorded for this service.</p>}
      {rows && rows.length > 0 && (
        <>
          <div>
            <h3 className="font-bold">Confirmed</h3>
            <p className="text-sm">Confirmed total: {confirmed.length ? subtotals(confirmed) : "none"}</p>
            <ul className="divide-y divide-slate-200">{confirmed.map(item)}</ul>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-amber-950">
            <h3 className="font-bold">Pending confirmation — not yet reconciled</h3>
            <p className="text-sm">Pending total: {pending.length ? subtotals(pending) : "none"}</p>
            <ul className="divide-y divide-amber-200">{pending.map(item)}</ul>
          </div>
        </>
      )}
    </section>
  );
}
