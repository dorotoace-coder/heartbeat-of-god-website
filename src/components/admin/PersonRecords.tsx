"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recordKindLabels } from "@/lib/people/links";
import { useSafeSave } from "@/lib/people/useSafeSave";

type Record = { record_kind: string; link_id: string | null; title: string; detail: string | null; occurred_at: string };
type Revision = { id: number; full_name: string; phone: string | null; address: string | null; social_contact: string | null; replaced_at: string };

/** A person's linked records and earlier details. Owner only; others see nothing. */
export default function PersonRecords({ personId, onRestored }: { personId: string; onRestored: () => void }) {
  const [records, setRecords] = useState<Record[] | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [hidden, setHidden] = useState(false);
  const [revision, setRevision] = useState(0);
  const [confirm, setConfirm] = useState<number | null>(null);
  const refresh = () => setRevision(value => value + 1);
  const { run, busy, message } = useSafeSave(() => { setConfirm(null); refresh(); onRestored(); }, refresh);
  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase.rpc("person_records", { p_person: personId }),
      supabase.from("person_revisions").select("id,full_name,phone,address,social_contact,replaced_at").eq("person_id", personId).order("replaced_at", { ascending: false }).limit(20),
    ]).then(([linked, earlier]) => {
      if (!active) return;
      // Records are owner-only; leave the section out for anyone else.
      setHidden(!!linked.error && linked.error.code === "42501");
      setRecords(linked.error ? [] : linked.data ?? []);
      setRevisions(earlier.error ? [] : earlier.data ?? []);
    });
    return () => { active = false; };
  }, [personId, revision]);
  if (hidden) return null;
  const when = (value: string) => new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  return <div className="mt-3 space-y-3 text-sm">
    <div><h4 className="font-semibold">Linked records</h4>
      {!records ? <p role="status">Loading linked records…</p> : !records.length ? <p className="text-slate-600">No linked records.</p> :
        <ul className="mt-1 space-y-1">{records.map((record, index) => <li key={`${record.record_kind}:${record.link_id ?? index}`}>
          <span className="font-semibold">{recordKindLabels[record.record_kind] ?? record.record_kind}:</span> {record.title}
          {record.detail && ` · ${record.detail}`} · {when(record.occurred_at)}
        </li>)}</ul>}
    </div>
    {revisions.length > 0 && <div><h4 className="font-semibold">Earlier details</h4>
      <ul className="mt-1 space-y-2">{revisions.map(item => <li key={item.id} className="rounded-lg bg-slate-50 p-2">
        <p>Until {when(item.replaced_at)}: {item.full_name}{item.phone && ` · ${item.phone}`}{item.address && ` · ${item.address}`}{item.social_contact && ` · ${item.social_contact}`}</p>
        {confirm === item.id ? <div className="mt-1 flex flex-wrap items-center gap-2">
          <span>Put these details back? The current details are kept here too.</span>
          <button type="button" disabled={busy} className="min-h-11 rounded-lg border border-purple-200 bg-white px-3 font-semibold disabled:opacity-50"
            onClick={() => void run(`restore:${item.id}`, () => supabase.rpc("person_restore", { p_revision: item.id }))}>{busy ? "Restoring…" : "Restore"}</button>
          <button type="button" className="min-h-11 rounded-lg border border-purple-200 bg-white px-3" onClick={() => setConfirm(null)}>Cancel</button>
        </div> : <button type="button" className="mt-1 min-h-11 rounded-lg border border-purple-200 bg-white px-3" onClick={() => setConfirm(item.id)}>Restore these details</button>}
      </li>)}</ul>
    </div>}
    {message && <p role="alert" className="text-amber-900">{message}</p>}
  </div>;
}
