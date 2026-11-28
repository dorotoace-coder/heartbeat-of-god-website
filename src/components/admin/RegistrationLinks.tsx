"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { LinkedPerson } from "@/lib/people/links";
import { useSafeSave } from "@/lib/people/useSafeSave";

type Registration = { registration_id: string; full_name: string; registered_at: string; same_phone: boolean; linked_person: string | null; link_id: string | null };
const button = "min-h-11 rounded-lg border border-purple-200 bg-white px-3 disabled:opacity-50";

/** Mighty Turn Around registrations with the linked contact's email, linkable one at a time. */
export default function RegistrationLinks({ contactKey, person }: { contactKey: string; person: LinkedPerson }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Registration[] | null>(null);
  const [loadProblem, setLoadProblem] = useState("");
  const [revision, setRevision] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const refresh = () => setRevision(value => value + 1);
  const { run, busy, message } = useSafeSave(() => { setConfirming(null); setChecked(false); refresh(); }, refresh);
  useEffect(() => {
    if (!open) return;
    let active = true;
    void supabase.rpc("person_registrations", { p_contact_key: contactKey }).then(result => {
      if (!active) return;
      setLoadProblem(result.error ? "Registrations could not load." : "");
      setRows(result.data ?? []);
    });
    return () => { active = false; };
  }, [open, contactKey, revision]);
  const date = (value: string) => new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  if (!open) return <button type="button" onClick={() => setOpen(true)} className={`${button} mt-2`}>Show registrations</button>;
  return <div className="mt-3 space-y-2 border-t border-purple-100 pt-3">
    <p className="font-semibold">Mighty Turn Around registrations with this email</p>
    {!rows ? <p role="status">Loading registrations…</p> : loadProblem ? <p className="text-amber-900">{loadProblem}</p> :
      !rows.length ? <p>No registrations use this email.</p> :
      <ul className="space-y-2">{rows.map(row => <li key={row.registration_id} className="rounded-lg bg-white p-2">
        <p>{row.full_name} · {date(row.registered_at)} · {row.same_phone ? "same phone" : "different phone"}</p>
        {row.linked_person === person.personId ? <p className="font-semibold">Linked to {person.name}</p>
          : row.linked_person ? <p className="text-amber-900">Linked to another person</p>
          : confirming === row.registration_id ? <div className="space-y-2">
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} /> I checked this registration is {person.name}.</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!checked || busy} className={`${button} font-semibold`} onClick={() => {
                const evidence = row.same_phone ? ["same_email", "same_phone"] : ["same_email"];
                void run(`registration:${row.registration_id}:${person.personId}`, id => supabase.rpc("person_link", {
                  p_link: id, p_source_type: "mta_registration", p_source_key: row.registration_id, p_person: person.personId,
                  p_evidence: evidence, p_note: null, p_identity_checked: true,
                }));
              }}>{busy ? "Saving…" : "Save link"}</button>
              <button type="button" className={button} onClick={() => { setConfirming(null); setChecked(false); }}>Cancel</button>
            </div>
          </div>
          : <button type="button" disabled={busy} className={button} onClick={() => { setConfirming(row.registration_id); setChecked(false); }}>Link to {person.name}</button>}
      </li>)}</ul>}
    {message && <p role="alert" className="text-amber-900">{message}</p>}
    <button type="button" onClick={() => setOpen(false)} className={button}>Hide registrations</button>
  </div>;
}
