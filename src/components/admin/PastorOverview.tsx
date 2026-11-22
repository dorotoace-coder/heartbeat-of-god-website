"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PastorStaffAccess from "./PastorStaffAccess";

const areas = [
  { name: "Attendance", detail: "Service counts and first-time visitors", view: "attendance" },
  { name: "People", detail: "Member directory and contact records", view: "members" },
  { name: "Treasury", detail: "Collections, confirmations and bank deposits", view: "treasury" },
  { name: "Media Vault", detail: "Private raw footage, audio and images", view: "media" },
  { name: "Foundation School", detail: "Classes, teachers and progress", view: "school" },
  { name: "Evangelism", detail: "Outreach visits and assigned follow-ups", view: "evangelism" },
  { name: "Events", detail: "Service and program planning", view: "events" },
];

const tasks = [
  { key: "collections", label: "Collections to confirm", detail: "Entries remain pending until the other officer confirms them.", view: "treasury" },
  { key: "deposits", label: "Bank deposits to verify", detail: "Compare the bank record before marking a deposit verified.", view: "treasury" },
  { key: "media", label: "Media awaiting review", detail: "Review the saved caption and intended use before approval.", view: "media" },
  { key: "followups", label: "Open outreach follow-ups", detail: "Check that each contact has an assigned worker and due date.", view: "evangelism" },
  { key: "school", label: "School requests without a class", detail: "Review the people directory and enroll them in a class as appropriate.", view: "school" },
] as const;

type TaskKey = (typeof tasks)[number]["key"];
type Counts = Record<TaskKey, number | null>;
const emptyCounts: Counts = { collections: null, deposits: null, media: null, followups: null, school: null };

export default function PastorOverview() {
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [loading, setLoading] = useState(true);
  const [partial, setPartial] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    let current = true;
    async function load() {
      setLoading(true);
      const [collections, deposits, media, followups, requests, enrollments] = await Promise.all([
        supabase.from("treasury_income").select("id", { count: "exact", head: true }).is("confirmed_at", null),
        supabase.from("treasury_cash_deposits").select("id", { count: "exact", head: true }).is("verified_at", null),
        supabase.from("media_asset_reviews").select("asset_path", { count: "exact", head: true }).eq("status", "in_review"),
        supabase.from("outreach_contacts").select("id", { count: "exact", head: true }).not("followup_date", "is", null).is("completed_at", null),
        supabase.from("congregation_people").select("id").eq("requests_school", true),
        supabase.from("foundation_students").select("person_id"),
      ]);
      if (!current) return;
      const results = { collections, deposits, media, followups };
      const assigned = new Set((enrollments.data ?? []).map(row => row.person_id));
      setCounts({
        collections: collections.error ? null : collections.count,
        deposits: deposits.error ? null : deposits.count,
        media: media.error ? null : media.count,
        followups: followups.error ? null : followups.count,
        school: requests.error || enrollments.error ? null : (requests.data ?? []).filter(row => !assigned.has(row.id)).length,
      });
      setPartial(Object.values(results).some(result => !!result.error) || !!requests.error || !!enrollments.error);
      setLoading(false);
    }
    void load();
    return () => { current = false; };
  }, [revision]);

  return <section className="space-y-6">
    <header className="rounded-3xl bg-[#2e1252] p-7 text-white">
      <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Heartbeat of God Ministry</p>
      <h1 className="mt-2 font-serif text-3xl">Pastor&apos;s workspace</h1>
      <p className="mt-2 text-purple-100">See what needs attention, then open each department&apos;s actual records.</p>
    </header>
    <div className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-700">Live work queue</p>
          <h2 className="mt-1 font-serif text-2xl text-[#2e1252]">Needs attention</h2></div>
        <button type="button" onClick={refresh} disabled={loading} className="min-h-11 rounded-xl border border-purple-200 px-4 text-sm font-semibold text-purple-900 disabled:opacity-50">Refresh counts</button>
      </div>
      {partial && <p role="alert" className="mt-3 text-sm text-red-800">Some counts could not load. Open the department for its current records.</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tasks.map(task => <Link key={task.key} href={`/admin?view=${task.view}`} className="rounded-2xl border border-purple-100 bg-[#faf8fc] p-5 transition hover:border-purple-400 hover:bg-purple-50">
          <span className="text-3xl font-semibold tabular-nums text-[#2e1252]">{loading ? "…" : counts[task.key] ?? "—"}</span>
          <h3 className="mt-2 font-semibold text-slate-950">{task.label}</h3>
          <p className="mt-1 text-sm text-slate-600">{task.detail}</p>
          <span className="mt-4 inline-block text-sm font-semibold text-purple-900">Open workspace →</span>
        </Link>)}
      </div>
      <p className="mt-4 text-xs text-slate-500">Counts show records currently visible to the Pastor. They are not a financial reconciliation or a record of who is online.</p>
    </div>
    <PastorStaffAccess />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {areas.map(area => <Link key={area.view} href={`/admin?view=${area.view}`}
        className="rounded-2xl border border-purple-100 bg-white p-5 text-slate-950 shadow-sm transition hover:border-purple-400 hover:shadow-md">
        <h2 className="font-semibold text-[#2e1252]">{area.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{area.detail}</p>
        <span className="mt-5 inline-block text-sm font-semibold text-purple-900">Open workspace →</span>
      </Link>)}
    </div>
  </section>;
}
