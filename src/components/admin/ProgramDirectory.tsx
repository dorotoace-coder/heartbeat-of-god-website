"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Contact = {
  import_key: string;
  display_name: string;
  email: string;
  phone_original: string;
  programs: string[];
  review_flags: string[];
  relationship: string;
  attendance: string;
};

export default function ProgramDirectory({ onChoose }: {
  onChoose: (contact: { name: string; phone: string }) => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [relationship, setRelationship] = useState("");
  const [attendance, setAttendance] = useState("");
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState("Loading program contacts…");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setStatus("Loading program contacts…");
      try {
        const result = await supabase.rpc("program_directory_current");
        if (!active) return;
        if (result.error) { setContacts([]); setStatus("Contacts could not load. Check your access and retry."); return; }
        setContacts(result.data ?? []);
        setStatus("");
      } catch { if (active) { setContacts([]); setStatus("Contacts could not load. Retry when connected."); } }
    }
    void load();
    const timer = window.setInterval(() => setRevision(value => value + 1), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [revision]);
  const visible = contacts.filter(contact =>
    (!program || contact.programs.includes(program)) &&
    (!relationship || contact.relationship === relationship) &&
    (!attendance || contact.attendance === attendance) &&
    [contact.display_name, contact.email, contact.phone_original].some(value => value.toLowerCase().includes(query.toLowerCase().trim())));
  return <section className="space-y-4 rounded-2xl border border-purple-100 bg-white p-5">
    <h2 className="font-serif text-2xl">Past program contacts</h2>
    <p className="text-sm text-slate-600">Search ILPC and Mighty Turn Around registrations. Confirm permission with the person before creating a follow-up. Newsletter preferences require separate confirmation.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label>Find a contact<input type="search" value={query} onChange={event => setQuery(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-purple-200 p-2" /></label>
      <label>Program<select value={program} onChange={event => setProgram(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-purple-200 p-2"><option value="">All programs</option><option value="ILPC">ILPC</option><option value="MTA">Mighty Turn Around</option></select></label>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label>Ministry relationship<select value={relationship} onChange={event => setRelationship(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-purple-200 p-2"><option value="">All relationships</option><option value="worker">Worker account matched</option><option value="member">Member confirmed</option><option value="unconfirmed">Membership unconfirmed</option><option value="review">Needs review</option></select></label>
      <label>Attendance<select value={attendance} onChange={event => setAttendance(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-purple-200 p-2"><option value="">All attendance</option><option value="mta_attended">MTA attendance confirmed</option><option value="unknown">Attendance unknown</option></select></label>
    </div>
    <p className="text-sm text-slate-600">Matches refresh every minute. Member confirmation requires a reviewed membership profile with matching email and phone. Worker matches use assigned staff accounts. Attendance uses recorded MTA check-ins.</p>
    <button type="button" onClick={() => setRevision(value => value + 1)} className="min-h-11 rounded-lg border border-purple-200 px-4">Refresh contacts</button>
    {status ? <p role="status">{status}</p> : <>
      <p className="text-sm text-slate-600">{visible.length} matching contacts</p>
      <ul className="space-y-3">{visible.map(contact => <li key={contact.import_key} className="rounded-xl border border-purple-100 p-4">
        <h3 className="font-semibold">{contact.display_name}</h3>
        <p className="break-all text-sm">{contact.email}</p>
        {contact.phone_original && <p className="text-sm">{contact.phone_original}</p>}
        <p className="text-sm text-slate-600">{contact.programs.map(value => value === "MTA" ? "Mighty Turn Around" : value).join(" · ")}</p>
        <p className="text-sm">{({ worker: "Worker account matched", member: "Member confirmed", unconfirmed: "Membership unconfirmed", review: "Needs review" } as Record<string, string>)[contact.relationship]} · {contact.attendance === "mta_attended" ? "MTA attendance confirmed" : "Attendance unknown"}</p>
        {contact.relationship === "review" ? <p className="mt-2 text-sm text-amber-900">Contact details need review before follow-up.</p> : <button type="button" onClick={() => onChoose({ name: contact.display_name, phone: contact.phone_original })} className="mt-3 min-h-11 rounded-lg border border-purple-200 px-4">Prepare follow-up</button>}
      </li>)}</ul>
      {!visible.length && <p>No matching contacts.</p>}
    </>}
  </section>;
}
