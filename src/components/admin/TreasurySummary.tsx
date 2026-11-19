"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import ServiceSelector, { type PulseService } from "./ServiceSelector";

type Summary = {
  church_id: string;
  month: string;
  currency: string;
  kind: string;
  category: string;
  confirmed_total: number;
  confirmed_entries: number;
  pending_total: number;
  pending_entries: number;
};

type Giver = { id: string; full_name: string };

const categories = ["tithe", "sunday_offering", "seed_offering", "thanksgiving", "special_offering", "pledge_redemption", "kces_dues", "donation", "other"];
// The database requires a named giver for these categories.
const namedCategories = ["tithe", "pledge_redemption", "kces_dues"];
const methods = ["cash", "bank_transfer", "pos", "online"];
const field = "block min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-slate-950";
const money = (currency: string, amount: number) =>
  `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function GiverPicker({ churchId, value, onChange }: { churchId: string; value: string; onChange: (id: string) => void }) {
  const [givers, setGivers] = useState<Giver[] | null>(null);
  const [error, setError] = useState(false);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let disposed = false;
    async function load() {
      const result = await supabase.from("treasury_givers").select("id,full_name")
        .eq("church_id", churchId).order("full_name").limit(1000);
      if (disposed) return;
      if (result.error) setError(true);
      else setGivers(result.data);
    }
    void load();
    return () => { disposed = true; };
  }, [churchId, version]);

  async function add() {
    const fullName = name.trim().replace(/\s+/g, " ");
    if (adding || !givers || fullName.length < 2) return;
    // Reuse an existing record rather than creating a duplicate giver.
    const existing = givers.find((giver) => giver.full_name.toLowerCase() === fullName.toLowerCase());
    if (existing) {
      onChange(existing.id);
      setName("");
      setNotice(`${existing.full_name} is already in the giver register and is now selected.`);
      return;
    }
    setAdding(true);
    setNotice("");
    try {
      const result = await supabase.from("treasury_givers")
        .insert({ church_id: churchId, full_name: fullName }).select("id").single();
      if (result.error) {
        setNotice("The giver could not be added. Refresh the list before trying again.");
        return;
      }
      onChange(result.data.id);
      setName("");
      setNotice(`${fullName} added and selected.`);
      setVersion((current) => current + 1);
    } finally {
      setAdding(false);
    }
  }

  if (error) return <p role="alert" className="col-span-full">The giver register could not load. Refresh to try again.</p>;
  if (givers === null) return <p role="status" className="col-span-full">Loading givers…</p>;

  return (
    <div className="col-span-full space-y-2">
      <label className="block">Giver
        <select className={field} required value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choose the giver</option>
          {givers.map((giver) => <option key={giver.id} value={giver.id}>{giver.full_name}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">Not listed? Add the giver&apos;s full name
          <input className={field} value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
        </label>
        <button type="button" disabled={adding || name.trim().length < 2} onClick={() => void add()}
          className="min-h-11 rounded-lg border border-[#2E1252] px-4 font-semibold text-[#2E1252] disabled:opacity-60">
          {adding ? "Adding…" : "Add giver"}
        </button>
      </div>
      <p role="status" className="text-sm">{notice}</p>
    </div>
  );
}

function RecordCollection({ churchId, onRecorded }: { churchId: string; onRecorded: () => void }) {
  const [method, setMethod] = useState("cash");
  const [category, setCategory] = useState("sunday_offering");
  const [giverId, setGiverId] = useState("");
  const [service, setService] = useState<PulseService | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [retryRequired, setRetryRequired] = useState(false);
  const attempt = useRef<{ id: string; signature: string } | null>(null);
  const needsGiver = namedCategories.includes(category);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !service) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const first = String(data.get("counter1") ?? "").trim();
    const second = String(data.get("counter2") ?? "").trim();
    if (!first) {
      setNotice(method === "cash" ? "Enter two distinct cash counters." : "Enter who verified this payment.");
      return;
    }
    if (method === "cash" && (!second || first.toLowerCase() === second.toLowerCase())) {
      setNotice("Enter two distinct cash counters.");
      return;
    }
    if (needsGiver && !giverId) {
      setNotice("Choose the giver for this category.");
      return;
    }
    const collection = {
      church_id: churchId,
      pulse_service_id: service.id,
      category,
      giver_id: needsGiver ? giverId : null,
      amount: data.get("amount"),
      currency: data.get("currency"),
      method,
      counted_by_1: first,
      counted_by_2: method === "cash" ? second : null,
    };
    const signature = JSON.stringify(collection);
    if (attempt.current && attempt.current.signature !== signature) {
      setNotice("Retry the original collection before entering a different one.");
      return;
    }
    const request = attempt.current ?? { id: crypto.randomUUID(), signature };
    attempt.current = request;
    setSaving(true);
    setNotice("");
    try {
      const result = await supabase.from("treasury_income").insert({ ...collection, id: request.id });
      if (result.error) {
        // An earlier request may have committed before its response was lost.
        const existing = await supabase.from("treasury_income").select("id")
          .eq("id", request.id).maybeSingle();
        if (existing.error || !existing.data) {
          const rejected = !retryRequired && result.status >= 400 && result.status < 500
            && ![408, 409, 429].includes(result.status) && Boolean(result.error.code);
          if (rejected) {
            attempt.current = null;
            setNotice("The database rejected this entry. Check your access and collection details before trying again.");
          } else {
            setRetryRequired(true);
            setNotice("The save is unverified. Keep this page open and retry the same collection.");
          }
          return;
        }
      }
      attempt.current = null;
      setRetryRequired(false);
      setNotice("Collection recorded and awaiting independent confirmation.");
      form.reset();
      setMethod("cash");
      setCategory("sunday_offering");
      setGiverId("");
      onRecorded();
    } catch {
      setRetryRequired(true);
      setNotice("The save is unverified. Keep this page open and retry the same collection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 sm:p-7">
      <fieldset disabled={saving} aria-describedby={retryRequired ? "collection-notice" : undefined} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-lg font-bold">Record a collection</legend>
        <ServiceSelector value={service} onChange={setService} />
        <label>Giving category<select className={field} name="category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((value) =>
          <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
        <label>Payment method<select className={field} value={method} onChange={(event) => setMethod(event.target.value)}>{methods.map((value) =>
          <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
        {needsGiver && <GiverPicker churchId={churchId} value={giverId} onChange={setGiverId} />}
        <label>Currency<select className={field} name="currency"><option>NGN</option><option>CAD</option></select></label>
        <label>Amount<input className={field} name="amount" type="number" inputMode="decimal" min="0.01" max="999999999999.99" step="0.01" required /></label>
        {method === "cash" ? <>
          <label>First cash counter<input className={field} name="counter1" maxLength={100} required /></label>
          <label>Second cash counter<input className={field} name="counter2" maxLength={100} required /></label>
        </> : <label>Verified by<input className={field} name="counter1" maxLength={100} required /></label>}
      </fieldset>
      <button disabled={saving || !service} className="min-h-11 rounded-lg bg-[#2E1252] px-5 text-white disabled:opacity-60">
        {saving ? "Saving…" : retryRequired ? "Retry collection" : "Record collection"}
      </button>
      <p id="collection-notice" role="status">{notice}</p>
    </form>
  );
}

type PendingCollection = {
  id: string;
  entry_date: string;
  service: string | null;
  category: string;
  amount: number;
  currency: string;
  method: string;
  entered_by: string | null;
  counted_by_1: string | null;
  counted_by_2: string | null;
};

function PendingCollections({ refresh, onConfirmed }: { refresh: number; onConfirmed: () => void }) {
  const [rows, setRows] = useState<PendingCollection[] | null>(null);
  const [actor, setActor] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [session, result] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("treasury_income")
          .select("id,entry_date,service,category,amount,currency,method,entered_by,counted_by_1,counted_by_2")
          .is("confirmed_at", null).order("entry_date", { ascending: true }).limit(50),
      ]);
      if (cancelled) return;
      if (session.error || result.error) {
        setRows(null);
        setMessage("Pending collections could not load. Refresh to try again.");
        return;
      }
      setActor(session.data.user?.id);
      setRows(result.data);
    }
    void load();
    return () => { cancelled = true; };
  }, [refresh]);

  async function confirm(id: string) {
    if (busy) return;
    setBusy(id);
    setMessage("");
    try {
      const result = await supabase.rpc("treasury_confirm_income", { p_id: id });
      if (result.error) {
        setMessage("Confirmation could not be verified. Refresh to check the collection before trying again.");
        return;
      }
      setRows((current) => current?.filter((row) => row.id !== id) ?? null);
      setMessage("Collection confirmed.");
      onConfirmed();
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 sm:p-7">
      <h2 className="text-lg font-bold">Awaiting independent confirmation</h2>
      <p role="status" className="mt-2 text-sm">{message}</p>
      {rows === null && !message && <p className="mt-2">Loading collections…</p>}
      {rows?.length === 0 && <p className="mt-2">No collections are waiting.</p>}
      <ul className="divide-y divide-slate-200">
        {rows?.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-semibold">{money(row.currency, row.amount)} · {row.category.replaceAll("_", " ")}</p>
              <p className="text-sm">{row.entry_date} · {row.service || "Service not specified"} · {row.method.replaceAll("_", " ")}</p>
              {row.counted_by_1 && row.counted_by_2 && <p className="text-sm">Cash counters: {row.counted_by_1} and {row.counted_by_2}</p>}
            </div>
            {actor && row.entered_by && actor !== row.entered_by ? (
              <button type="button" disabled={Boolean(busy)} onClick={() => void confirm(row.id)}
                className="min-h-11 rounded-lg bg-[#2E1252] px-4 text-white disabled:opacity-60">
                {busy === row.id ? "Confirming…" : "Confirm collection"}
              </button>
            ) : <span className="text-sm">Requires the other authorized reviewer</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function TreasurySummary() {
  const [rows, setRows] = useState<Summary[]>([]);
  const [churchId, setChurchId] = useState<string>();
  const [status, setStatus] = useState<"loading" | "denied" | "ready" | "error">("loading");
  const [refresh, setRefresh] = useState(0);
  const reload = () => setRefresh((version) => version + 1);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const access = await supabase.from("treasury_portal_access").select("church_id");
      if (cancelled) return;
      if (access.error) return setStatus("error");
      if (!access.data.length) return setStatus("denied");
      if (access.data.length === 1) setChurchId(access.data[0].church_id);
      const result = await supabase.from("treasury_monthly_reconciliation")
        .select("church_id,month,currency,kind,category,confirmed_total,confirmed_entries,pending_total,pending_entries")
        .order("month", { ascending: false }).limit(50);
      if (cancelled) return;
      if (result.error) return setStatus("error");
      setRows(result.data);
      setStatus("ready");
    }
    void load();
    return () => { cancelled = true; };
  }, [refresh]);

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header className="rounded-2xl bg-[#2E1252] p-6 text-white sm:p-8">
        <h1 className="text-3xl font-bold">Treasury</h1>
        <p className="mt-2 text-white/90">Monthly income and expense summaries</p>
      </header>
      {status === "ready" && churchId && <RecordCollection churchId={churchId} onRecorded={reload} />}
      {status === "ready" && <PendingCollections refresh={refresh} onConfirmed={reload} />}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 sm:p-7">
        {status === "loading" && <p role="status">Checking Treasury access…</p>}
        {status === "denied" && <p>Treasury access is limited to the Pastor and Treasury Leader.</p>}
        {status === "error" && <p role="alert">Treasury could not load. Refresh the page or contact your administrator.</p>}
        {status === "ready" && rows.length === 0 && <p>No monthly totals are available yet.</p>}
        {status === "ready" && rows.length > 0 && (
          <>
            <h2 className="text-lg font-bold">Recent monthly totals</h2>
            <p className="mt-1 text-sm">Confirmed totals include only entries checked by the other authorized reviewer. Pending amounts are not yet reconciled.</p>
            <ul className="mt-3 divide-y divide-slate-200">
              {rows.map((row) => (
                <li key={JSON.stringify([row.church_id, row.month, row.currency, row.kind, row.category])}
                  className="space-y-1 py-3">
                  <p className="font-semibold capitalize">{row.kind} · {row.category.replaceAll("_", " ")} · {row.month.slice(0, 7)}</p>
                  <p className="flex flex-wrap justify-between gap-2">
                    <span>Confirmed · {row.confirmed_entries} {row.confirmed_entries === 1 ? "entry" : "entries"}</span>
                    <span className="font-semibold tabular-nums">{money(row.currency, row.confirmed_total)}</span>
                  </p>
                  {row.pending_entries > 0 && (
                    <p className="flex flex-wrap justify-between gap-2 rounded-md bg-amber-50 px-2 py-1 text-amber-950">
                      <span>Pending confirmation · {row.pending_entries} {row.pending_entries === 1 ? "entry" : "entries"}</span>
                      <span className="font-semibold tabular-nums">{money(row.currency, row.pending_total)}</span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
