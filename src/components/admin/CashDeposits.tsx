"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import ServiceSelector, { type PulseService } from "./ServiceSelector";
import { money } from "./treasuryFormat";

type Deposit = {
  id: string; amount: number; currency: string; bank_reference: string;
  recorded_by: string; recorded_at: string; verified_at: string | null;
};

export default function CashDeposits({ churchId, revision, onChanged }: {
  churchId: string; revision: number; onChanged: () => void;
}) {
  const [service, setService] = useState<PulseService | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [actor, setActor] = useState<string>();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ id: string; signature: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const [who, rows] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("treasury_cash_deposits")
          .select("id,amount,currency,bank_reference,recorded_by,recorded_at,verified_at")
          .eq("church_id", churchId).order("recorded_at", { ascending: false }).limit(30),
      ]);
      if (!active) return;
      if (who.error || rows.error) setNotice("Bank deposit records could not load. Refresh to retry.");
      else { setActor(who.data.user?.id); setDeposits(rows.data); }
    }
    void load();
    return () => { active = false; };
  }, [churchId, revision]);

  async function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service || busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const entry = { service: service.id, currency: values.get("currency"), amount: values.get("amount"), reference: String(values.get("reference") ?? "").trim() };
    const signature = JSON.stringify(entry);
    if (pending.current && pending.current.signature !== signature) {
      setNotice("Retry the original bank deposit before starting a different entry. Refresh to check its status if needed.");
      return;
    }
    pending.current ??= { id: crypto.randomUUID(), signature };
    setBusy(true);
    const result = await supabase.rpc("record_cash_deposit", {
      p_id: pending.current.id, p_church: churchId, p_service: service.id,
      p_currency: entry.currency, p_amount: entry.amount,
      p_reference: entry.reference,
    });
    setBusy(false);
    if (result.error) {
      setNotice("Deposit was not verified. Check the confirmed cash balance and bank reference, then retry this entry.");
      return;
    }
    pending.current = null;
    form.reset(); setService(null); setNotice("Bank deposit recorded. The other officer can verify it.");
    onChanged();
  }

  async function verify(id: string) {
    setBusy(true);
    const result = await supabase.rpc("verify_cash_deposit", { p_id: id });
    setBusy(false);
    setNotice(result.error ? "Verification failed. Refresh and check that the other officer recorded it." : "Bank deposit verified.");
    if (!result.error) onChanged();
  }

  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 sm:p-7">
    <div><h2 className="text-lg font-bold">Cash sent to the bank</h2>
      <p className="text-sm">Record a deposit only after the collection is confirmed and the bank has given you a reference. The other officer verifies it.</p></div>
    <form onSubmit={record} className="grid gap-3 sm:grid-cols-2">
      <ServiceSelector value={service} onChange={setService} />
      <label>Currency<select className="block min-h-11 w-full rounded-lg border px-3" name="currency"><option>NGN</option><option>CAD</option></select></label>
      <label>Cash deposited<input className="block min-h-11 w-full rounded-lg border px-3" name="amount" type="number" min="0.01" step="0.01" required /></label>
      <label className="sm:col-span-2">Bank reference<input className="block min-h-11 w-full rounded-lg border px-3" name="reference" maxLength={160} required /></label>
      <button disabled={busy || !service} className="min-h-11 rounded-lg bg-[#2E1252] px-4 text-white disabled:opacity-50">Record bank deposit</button>
    </form>
    <p role="status">{notice}</p>
    <div><h3 className="font-semibold">Recent deposits</h3>
      {!deposits.length && <p className="mt-2 text-sm">No bank deposits recorded yet.</p>}
      <ul className="divide-y">{deposits.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div><p className="font-semibold">{money(item.currency, item.amount)} · {item.bank_reference}</p>
          <p className="text-sm">{item.recorded_at.slice(0, 10)} · {item.verified_at ? "Verified" : "Awaiting the other officer"}</p></div>
        {!item.verified_at && actor && actor !== item.recorded_by &&
          <button disabled={busy} className="min-h-11 rounded-lg border border-[#2E1252] px-4 text-[#2E1252] disabled:opacity-50" onClick={() => void verify(item.id)}>Verify deposit</button>}
      </li>)}</ul>
    </div>
  </section>;
}
