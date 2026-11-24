"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  areaTitle,
  partnershipAreas,
  type Commitment,
  type Gift,
} from "@/lib/partnership/catalogue";
export default function PartnershipAdministration() {
  const [allowed, setAllowed] = useState(false);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [actor, setActor] = useState("");
  const [notice, setNotice] = useState("Checking partnership access…");
  const [busy, setBusy] = useState(false);
  const [project, setProject] = useState("all");
  const load = useCallback(async () => {
    const access = await supabase.rpc("partnership_officer");
    if (access.error || !access.data) {
      setAllowed(false);
      setNotice(
        access.error
          ? "Partnership administration is not connected yet."
          : "Partnership financial records are restricted to the Pastor and Treasury Leader.",
      );
      return;
    }
    setAllowed(true);
    const identity = await supabase.auth.getUser();
    setActor(identity.data.user?.id ?? "");
    const [c, g] = await Promise.all([
      supabase
        .from("partnership_commitments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(501),
      supabase
        .from("partnership_gifts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1001),
    ]);
    if (c.error || g.error) {
      setNotice("Partnership records could not load. Refresh to retry.");
      return;
    }
    setCommitments(c.data);
    setGifts(g.data);
    setNotice(
      c.data.length > 500 || g.data.length > 1000
        ? "Showing a recent-record window. Totals below cover only these loaded records."
        : "Totals below cover all loaded records. Different currencies are kept separate.",
    );
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function review(id: string, received: boolean) {
    setBusy(true);
    try {
      const r = await supabase.rpc("review_partnership_gift", {
        p_id: id,
        p_received: received,
      });
      if (r.error) throw r.error;
      await load();
      setNotice(
        received
          ? "Bank verification saved. This gift is now received."
          : "Gift marked not verified. It is excluded from received totals.",
      );
    } catch {
      setNotice(
        "Verification was not confirmed. A different authorized officer must check the bank record; refresh and retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  const filtered = commitments.filter(
    (c) => project === "all" || c.project === project,
  );
  const ids = new Set(filtered.map((c) => c.id));
  const rows = gifts.filter((g) => ids.has(g.commitment_id));
  const received = rows.filter((g) => g.state === "received");
  const pending = rows.filter((g) => g.state === "pending");
  const totals = new Map<string, number>();
  for (const gift of received)
    totals.set(
      gift.currency,
      (totals.get(gift.currency) ?? 0) +
        (gift.disputed
          ? 0
          : Number(gift.amount) - Number(gift.refunded_amount || 0)),
    );
  return (
    <section className="space-y-5 rounded-2xl border border-purple-200 bg-white p-5 text-slate-950 sm:p-7">
      <header>
        <p className="text-xs uppercase tracking-wider text-purple-700">
          Designated giving
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Partnerships</h2>
        <p className="mt-2 text-sm leading-6">
          Review commitments, project allocations and verified gifts. These
          gifts have their own ledger; do not enter them again as a service
          collection.
        </p>
        <Link
          href="/partnership"
          className="mt-3 inline-flex min-h-11 items-center font-semibold text-purple-900 underline"
        >
          Open public partnership centre
        </Link>
      </header>
      <p role="status" className="text-sm leading-6">
        {notice}
      </p>
      {allowed && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-semibold">
              Partnership area
              <select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="mt-2 block min-h-11 rounded-lg border p-3"
              >
                <option value="all">All five areas</option>
                {partnershipAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => void load()}
              className="min-h-11 rounded-lg border px-4"
            >
              Refresh records
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-purple-50 p-4">
              <strong>
                {filtered.filter((c) => c.state === "active").length}
              </strong>
              <p>Active commitments</p>
              <p className="mt-1 text-xs">
                Commitments are not received income.
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <strong>{pending.length}</strong>
              <p>Awaiting verification</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <strong>Available after reversals</strong>
              {[...totals].map(([currency, amount]) => (
                <p key={currency}>
                  {currency} {amount.toFixed(2)}
                </p>
              ))}
              {!totals.size && <p>No received gifts yet.</p>}
            </div>
          </div>
          <h3 className="font-semibold">Bank gifts awaiting verification</h3>
          <p className="text-sm leading-6">
            Check the actual bank record before confirming. A partner’s
            notification alone is not proof of payment. Officers cannot verify
            gifts they reported themselves.
          </p>
          {!pending.length && (
            <p className="text-sm">No pending gifts in this view.</p>
          )}
          <ul className="divide-y">
            {pending.map((g) => {
              const c = commitments.find((c) => c.id === g.commitment_id)!;
              return (
                <li key={g.id} className="space-y-2 py-4">
                  <p className="font-semibold">
                    {c.full_name} · {areaTitle(c.project)}
                  </p>
                  <p>
                    {g.currency} {Number(g.amount).toFixed(2)} ·{" "}
                    <span className="break-all">{g.reference}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busy || g.reported_by === actor}
                      onClick={() => void review(g.id, true)}
                      className="min-h-11 rounded-lg bg-purple-950 px-4 text-white disabled:opacity-50"
                    >
                      Confirm bank receipt
                    </button>
                    <button
                      disabled={busy || g.reported_by === actor}
                      onClick={() => void review(g.id, false)}
                      className="min-h-11 rounded-lg border px-4 disabled:opacity-50"
                    >
                      Not verified
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <details>
            <summary className="min-h-11 cursor-pointer font-semibold">
              Commitments and partner care
            </summary>
            <p className="my-3 text-sm">
              Update preferences are requests only. No messages or reminder
              schedules are activated by this screen.
            </p>
            <ul className="divide-y">
              {filtered.map((c) => (
                <li key={c.id} className="py-3 text-sm leading-6">
                  <strong>{c.full_name}</strong> · {areaTitle(c.project)}
                  <br />
                  {c.currency} {Number(c.amount).toFixed(2)} · {c.frequency} ·{" "}
                  {c.method} · {c.state}
                  {c.provider_status ? ` · ${c.provider_status}` : ""}
                  <br />
                  Updates: {c.updates_opt_in ? "requested" : "not requested"}
                </li>
              ))}
            </ul>
          </details>
          <details>
            <summary className="min-h-11 cursor-pointer font-semibold">
              Giving ledger
            </summary>
            <ul className="divide-y">
              {rows.map((g) => (
                <li key={g.id} className="break-words py-3 text-sm leading-6">
                  {commitments.find((c) => c.id === g.commitment_id)?.full_name}{" "}
                  · {g.currency} {Number(g.amount).toFixed(2)} · {g.state}
                  {Number(g.refunded_amount) > 0
                    ? ` · Refunded ${Number(g.refunded_amount).toFixed(2)}`
                    : ""}
                  {g.disputed ? " · Disputed" : ""}
                  <br />
                  {g.reference} · {g.created_at.slice(0, 10)}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
