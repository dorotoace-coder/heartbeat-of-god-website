"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { describeReasons, evidenceOptions, type LinkedPerson } from "@/lib/people/links";
import { useSafeSave } from "@/lib/people/useSafeSave";
import RegistrationLinks from "./RegistrationLinks";

type Candidate = { person_id: string; full_name: string; reasons: string[]; active_links: number };
const button = "min-h-11 rounded-lg border border-purple-200 px-4 disabled:opacity-50";

/** Link one directory contact to a person, or show and remove its link. Owner only; the database enforces it. */
export default function PersonLinkPanel({ contactKey, contactName, linked, onChanged }: {
  contactKey: string; contactName: string; linked?: LinkedPerson; onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { run, busy, message, setMessage } = useSafeSave(() => { setOpen(false); onChanged(); }, onChanged);

  if (linked) return <div className="mt-3 rounded-lg bg-purple-50 p-3 text-sm">
    <p className="font-semibold">Linked to {linked.name}</p>
    {linked.otherContacts > 0 && <p>{linked.otherContacts} other program {linked.otherContacts === 1 ? "contact is" : "contacts are"} linked to this person.</p>}
    {!open ? <button type="button" onClick={() => { setOpen(true); setMessage(""); }} className={`${button} mt-2 bg-white`}>Unlink</button> :
      <UnlinkForm busy={busy} onCancel={() => setOpen(false)} onSubmit={reason =>
        run(`unlink:${linked.linkId}:${reason}`, () => supabase.rpc("person_unlink", { p_link: linked.linkId, p_reason: reason }))} />}
    {message && <p role="alert" className="mt-2 text-amber-900">{message}</p>}
    <RegistrationLinks contactKey={contactKey} person={linked} />
  </div>;

  return <div className="mt-3">
    {!open ? <button type="button" onClick={() => { setOpen(true); setMessage(""); }} className={button}>Link to a person</button> :
      <LinkForm contactKey={contactKey} contactName={contactName} busy={busy} onCancel={() => setOpen(false)} onSubmit={(person, evidence, note) =>
        run(JSON.stringify([person, evidence, note]), id => supabase.rpc("person_link", {
          p_link: id, p_source_type: "directory_contact", p_source_key: contactKey, p_person: person,
          p_evidence: evidence, p_note: note || null, p_identity_checked: true,
        }))} />}
    {message && <p role="alert" className="mt-2 text-sm text-amber-900">{message}</p>}
  </div>;
}

function LinkForm({ contactKey, contactName, busy, onCancel, onSubmit }: {
  contactKey: string; contactName: string; busy: boolean; onCancel: () => void;
  onSubmit: (person: string | null, evidence: string[], note: string) => Promise<boolean>;
}) {
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [loadProblem, setLoadProblem] = useState("");
  const [choice, setChoice] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState("");
  useEffect(() => {
    let active = true;
    void supabase.rpc("person_candidates", { p_source_type: "directory_contact", p_source_key: contactKey }).then(result => {
      if (!active) return;
      if (result.error) setLoadProblem("Possible matches could not load. You can still create a new person.");
      setCandidates(result.data ?? []);
    });
    return () => { active = false; };
  }, [contactKey]);
  const pick = (value: string) => {
    setChoice(value);
    setEvidence((candidates ?? []).find(candidate => candidate.person_id === value)?.reasons ?? []);
  };
  const ready = choice && evidence.length > 0 && checked && !busy;
  return <fieldset disabled={busy} className="space-y-3 rounded-lg border border-purple-100 p-3 text-sm">
    <legend className="px-1 font-semibold">Link {contactName} to a person</legend>
    {!candidates ? <p role="status">Looking for possible matches…</p> : <div role="radiogroup" aria-label="Person" className="space-y-2">
      {candidates.length === 0 && !loadProblem && <p>No existing person shares this email, phone or name.</p>}
      {loadProblem && <p className="text-amber-900">{loadProblem}</p>}
      {candidates.map(candidate => <label key={candidate.person_id} className="flex min-h-11 items-start gap-2">
        <input type="radio" name={`person-${contactKey}`} className="mt-1" checked={choice === candidate.person_id} onChange={() => pick(candidate.person_id)} />
        <span><span className="font-semibold">{candidate.full_name}</span> · {describeReasons(candidate.reasons)}
          {candidate.active_links > 0 && ` · ${candidate.active_links} linked ${candidate.active_links === 1 ? "contact" : "contacts"}`}</span>
      </label>)}
      <label className="flex min-h-11 items-start gap-2">
        <input type="radio" name={`person-${contactKey}`} className="mt-1" checked={choice === "new"} onChange={() => pick("new")} />
        <span>New person: <span className="font-semibold">{contactName}</span></span>
      </label>
    </div>}
    <fieldset className="space-y-1"><legend className="font-semibold">Evidence</legend>
      {evidenceOptions.map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-2">
        <input type="checkbox" checked={evidence.includes(value)} onChange={event => setEvidence(current => event.target.checked ? [...current, value] : current.filter(item => item !== value))} />{label}
      </label>)}
    </fieldset>
    <label className="block">Note (optional)<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={300} className="mt-1 block w-full rounded-lg border border-purple-200 p-2" /></label>
    <label className="flex min-h-11 items-center gap-2 font-semibold">
      <input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} /> I checked this is the same person.
    </label>
    <p className="text-slate-600">Linking changes no registration, membership or permission to contact. You can unlink later.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={!ready} onClick={() => void onSubmit(choice === "new" ? null : choice, evidence, note.trim())} className={`${button} bg-purple-900 font-semibold text-white`}>{busy ? "Saving…" : "Save link"}</button>
      <button type="button" onClick={onCancel} className={button}>Cancel</button>
    </div>
  </fieldset>;
}

function UnlinkForm({ busy, onCancel, onSubmit }: { busy: boolean; onCancel: () => void; onSubmit: (reason: string) => Promise<boolean> }) {
  const [reason, setReason] = useState("");
  return <fieldset disabled={busy} className="mt-2 space-y-2">
    <label className="block">Why remove this link?<textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={300} required className="mt-1 block w-full rounded-lg border border-purple-200 bg-white p-2" /></label>
    <p className="text-slate-600">The person record and the registration stay. The link is kept in history as removed.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={!reason.trim() || busy} onClick={() => void onSubmit(reason.trim())} className={`${button} bg-white font-semibold`}>{busy ? "Removing…" : "Remove link"}</button>
      <button type="button" onClick={onCancel} className={`${button} bg-white`}>Cancel</button>
    </div>
  </fieldset>;
}
