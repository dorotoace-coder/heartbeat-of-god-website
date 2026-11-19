"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import ServiceSelector, { type PulseService } from "./ServiceSelector";

type Summary = {
  church_id: string;
  month: string;
  currency: string;
  kind: string;
  category: string;
  total: number;
  entries: number;
};

const categories = ["tithe", "sunday_offering", "seed_offering", "thanksgiving", "special_offering", "pledge_redemption", "kces_dues", "donation", "other"];
const methods = ["cash", "bank_transfer", "pos", "online"];
const field = "block min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 text-slate-950";

function RecordCollection({ churchId, onRecorded }: { churchId: string; onRecorded: () => void }) {
  const [method, setMethod] = useState("cash");
  const [service, setService] = useState<PulseService | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !service) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const first = String(data.get("counter1") ?? "").trim();
    const second = String(data.get("counter2") ?? "").trim();
    if (method === "cash" && (!first || !second || first.toLowerCase() === second.toLowerCase())) {
      setNotice("Enter two distinct cash counters.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const result = await supabase.from("treasury_income").insert({
        church_id: churchId,
        pulse_service_id: service.id,
        category: data.get("category"),
        amount: data.get("amount"),
        currency: data.get("currency"),
        method,
        counted_by_1: first || null,
        counted_by_2: second || null,
      });
      if (result.error) {
        setNotice("Save was not confirmed. Check with the other Treasury user before resubmitting.");
        return;
      }
      setNotice("Collection recorded and awaiting independent confirmation.");
      form.reset();
      setMethod("cash");
      onRecorded();
    } catch {
      setNotice("Save was not confirmed. Check with the other Treasury user before resubmitting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 sm:p-7">
      <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-4 text-lg font-bold">Record a collection</legend>
        <ServiceSelector value={service} onChange={setService} />
        <label>Giving category<select className={field} name="category">{categories.map((category) =>
          <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}</select></label>
        <label>Payment method<select className={field} value={method} onChange={(event) => setMethod(event.target.value)}>{methods.map((value) =>
          <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
        <label>Currency<select className={field} name="currency"><option>NGN</option><option>CAD</option></select></label>
        <label>Amount<input className={field} name="amount" type="number" inputMode="decimal" min="0.01" max="999999999999.99" step="0.01" required /></label>
        {method === "cash" && <>
          <label>First cash counter<input className={field} name="counter1" maxLength={100} required /></label>
          <label>Second cash counter<input className={field} name="counter2" maxLength={100} required /></label>
        </>}
      </fieldset>
      <button disabled={saving || !service} className="min-h-11 rounded-lg bg-[#2E1252] px-5 text-white disabled:opacity-60">
        {saving ? "Saving…" : "Record collection"}
      </button>
      <p role="status">{notice}</p>
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
              <p className="font-semibold">{row.currency} {Number(row.amount).toFixed(2)} · {row.category.replaceAll("_", " ")}</p>
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
      const result = await supabase.from("treasury_monthly_summary")
        .select("church_id,month,currency,kind,category,total,entries")
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
            <ul className="mt-3 divide-y divide-slate-200">
              {rows.map((row) => (
                <li key={JSON.stringify([row.church_id, row.month, row.currency, row.kind, row.category])}
                  className="flex flex-wrap justify-between gap-2 py-3">
                  <div>
                    <p className="font-semibold capitalize">{row.kind} · {row.category.replaceAll("_", " ")}</p>
                    <p className="text-sm">{row.month.slice(0, 7)} · {row.entries} entries</p>
                  </div>
                  <p className="font-semibold tabular-nums">{row.currency} {Number(row.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
