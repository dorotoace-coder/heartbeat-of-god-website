"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { permissionPurposes, permissionStateLabels, type PermissionState } from "@/lib/people/links";
import { useSafeSave } from "@/lib/people/useSafeSave";

const button = "min-h-11 rounded-lg border border-purple-200 bg-white px-3 disabled:opacity-50";
const field = "mt-1 block min-h-11 w-full rounded-lg border border-purple-200 bg-white p-2";
const methods = [["in_person", "In person"], ["reply_message", "They replied to a message or call"], ["signed_form", "Signed form"]] as const;

/** What this address has agreed to receive, and recording a new decision. Owner only; nothing is sent from here. */
export default function ContactPermissionPanel({ address, personId, states, onChanged }: {
  address: string; personId?: string; states?: Record<string, PermissionState>; onChanged: () => void;
}) {
  const [mode, setMode] = useState<"" | "granted" | "withdrawn">("");
  const [purposes, setPurposes] = useState<string[]>([]);
  const [method, setMethod] = useState("");
  const [wording, setWording] = useState("");
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState(false);
  const { run, busy, message } = useSafeSave(() => { setMode(""); setPurposes([]); setMethod(""); setWording(""); setNote(""); setChecked(false); onChanged(); }, onChanged);
  const state = (purpose: string): PermissionState => states?.[purpose] ?? "unknown";
  const blocked = permissionPurposes.some(([purpose]) => state(purpose) === "suppressed");
  const ready = purposes.length > 0 && !busy && (mode === "withdrawn" || (method && wording.trim().length >= 10 && checked));
  const open = (next: "granted" | "withdrawn") => { setMode(next); setPurposes([]); setMethod(""); setWording(""); setNote(""); setChecked(false); };

  return <div className="mt-3 rounded-lg border border-purple-100 p-3 text-sm">
    <p className="font-semibold">Email permission</p>
    <ul className="mt-1">{permissionPurposes.map(([purpose, label]) => <li key={purpose}>{label}: {permissionStateLabels[state(purpose)]}</li>)}</ul>
    {!states && <p className="text-amber-900">Permission could not load. Treat every type as not asked.</p>}
    {!mode ? <div className="mt-2 flex flex-wrap gap-2">
      {!blocked && <button type="button" className={button} onClick={() => open("granted")}>Record permission</button>}
      <button type="button" className={button} onClick={() => open("withdrawn")}>Record they asked to stop</button>
    </div> : <fieldset disabled={busy} className="mt-3 space-y-2">
      <legend className="font-semibold">{mode === "granted" ? "Record what they agreed to" : "Record what they asked to stop"}</legend>
      {permissionPurposes.map(([purpose, label]) => <label key={purpose} className="flex min-h-11 items-center gap-2">
        <input type="checkbox" checked={purposes.includes(purpose)} onChange={event => setPurposes(current => event.target.checked ? [...current, purpose] : current.filter(item => item !== purpose))} />{label}
      </label>)}
      {mode === "granted" && <>
        <label className="block">How they agreed<select value={method} onChange={event => setMethod(event.target.value)} className={field}>
          <option value="">Choose</option>{methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label className="block">What you asked them, in your words<textarea value={wording} onChange={event => setWording(event.target.value)} maxLength={500} placeholder="For example: May we email you invitations to ministry events?" className={field} /></label>
        <label className="flex min-h-11 items-center gap-2 font-semibold"><input type="checkbox" checked={checked} onChange={event => setChecked(event.target.checked)} /> I checked this email address belongs to the person who agreed.</label>
      </>}
      <label className="block">Note (optional)<input value={note} onChange={event => setNote(event.target.value)} maxLength={300} className={field} /></label>
      <p className="text-slate-600">{mode === "granted" ? "Only record what the person clearly agreed to. Registering for an event or being a member is not agreement." : "Asking to stop always takes effect, whatever was agreed before."} Nothing is sent from here.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!ready} className={`${button} font-semibold`} onClick={() => {
          const payload = { p_address: address, p_purposes: purposes, p_decision: mode, p_method: mode === "granted" ? method : "owner_recorded",
            p_wording: mode === "granted" ? wording.trim() : null, p_note: note.trim() || null, p_person: personId ?? null, p_identity_checked: mode === "granted" && checked };
          void run(JSON.stringify(payload), id => supabase.rpc("permission_record", { p_request: id, ...payload }));
        }}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" className={button} onClick={() => setMode("")}>Cancel</button>
      </div>
    </fieldset>}
    {message && <p role="alert" className="mt-2 text-amber-900">{message}</p>}
  </div>;
}
