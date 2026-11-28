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
};

export default function ProgramDirectory({ onChoose }: {
  onChoose: (contact: { name: string; phone: string }) => void;
}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [program, setProgram] = useState("");
  const [status, setStatus] = useState("Loading program contacts…");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setStatus("Loading program contacts…");
      try {
        const result = await supabase.from("program_outreach_directory")
          .select("import_key,display_name,email,phone_original,programs,review_flags")
          .order("display_name").limit(1000);
        if (!active) return;
        if (result.error) { setContacts([]); setStatus("Contacts could not load. Check your access and retry."); return; }
        setContacts(result.data ?? []);
        setStatus("");
      } catch { if (active) { setContacts([]); setStatus("Contacts could not load. Retry when connected."); } }
    }
    void load();
    return () => { active = false; };
  }, [revision]);
  const visible = contacts.filter(contact =>
    (!program || contact.programs.includes(program)) &&
    [contact.display_name, contact.email, contact.phone_original].some(value => value.toLowerCase().includes(query.toLowerCase().trim())));
  return <section className="space-y-4 rounded-2xl border border-purple-100 bg-white p-5">
    <h2 className="font-serif text-2xl">Past program contacts</h2>
    <p className="text-sm text-slate-600">Search ILPC and Mighty Turn Around registrations. Confirm permission with the person before creating a follow-up. Newsletter preferences require separate confirmation.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label>Find a contact<input type="search" value={query} onChange={event => setQuery(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-purple-200 p-2" /></label>
      <label>Program<select value={program} onChange={event => setProgram(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-purple-200 p-2"><option value="">All programs</option><option value="ILPC">ILPC</option><option value="MTA">Mighty Turn Around</option></select></label>
    </div>
    <button type="button" onClick={() => setRevision(value => value + 1)} className="min-h-11 rounded-lg border border-purple-200 px-4">Refresh contacts</button>
    {status ? <p role="status">{status}</p> : <>
      <p className="text-sm text-slate-600">{visible.length} matching contacts · Up to 1,000 records loaded</p>
      <ul className="space-y-3">{visible.map(contact => <li key={contact.import_key} className="rounded-xl border border-purple-100 p-4">
        <h3 className="font-semibold">{contact.display_name}</h3>
        <p className="break-all text-sm">{contact.email}</p>
        {contact.phone_original && <p className="text-sm">{contact.phone_original}</p>}
        <p className="text-sm text-slate-600">{contact.programs.map(value => value === "MTA" ? "Mighty Turn Around" : value).join(" · ")}</p>
        {contact.review_flags.length > 0 ? <p className="mt-2 text-sm text-amber-900">Contact details need review before follow-up.</p> : <button type="button" onClick={() => onChoose({ name: contact.display_name, phone: contact.phone_original })} className="mt-3 min-h-11 rounded-lg border border-purple-200 px-4">Prepare follow-up</button>}
      </li>)}</ul>
      {!visible.length && <p>No matching contacts.</p>}
    </>}
  </section>;
}
