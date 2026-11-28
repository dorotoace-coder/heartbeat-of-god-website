"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { summariseLinks as summarisePersonLinks, type LinkedPerson } from "@/lib/people/links";
import PersonLinkPanel from "./PersonLinkPanel";
import { describeEvidence, filterDirectory, linkStatus, refreshProblem, relationshipLabels, summariseLinks, type DirectoryContact, type DirectoryLink } from "@/lib/followup/directory";

export type ChosenContact = { importKey: string | null; name: string; phone: string };

const field = "mt-1 block min-h-11 w-full rounded-lg border border-purple-200 p-2";

export default function ProgramDirectory({ onChoose, refreshKey }: { onChoose: (contact: ChosenContact) => void; refreshKey: number }) {
  const [contacts, setContacts] = useState<DirectoryContact[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [problem, setProblem] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [relationship, setRelationship] = useState("");
  const [attendance, setAttendance] = useState("");
  const [program, setProgram] = useState("");
  const [revision, setRevision] = useState(0);
  const [links, setLinks] = useState<Record<string, DirectoryLink>>({});
  const [linkProblem, setLinkProblem] = useState(false);
  const [people, setPeople] = useState<Record<string, LinkedPerson>>({});
  const [peopleProblem, setPeopleProblem] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      setRefreshing(true);
      try {
        const [result, history, personLinks] = await Promise.all([
          supabase.rpc("program_directory_current"),
          supabase.from("ministry_followup_requests").select("directory_import_key,followup_date,completed_at,closure_outcome")
            .not("directory_import_key", "is", null).order("created_at", { ascending: false }).limit(1000),
          supabase.from("person_source_links").select("id,person_id,source_key")
            .eq("source_type", "directory_contact").is("unlinked_at", null).limit(1000),
        ]);
        if (!active) return;
        setLinkProblem(!!history.error);
        if (!history.error) setLinks(summariseLinks(history.data ?? []));
        let names: Record<string, string> = {};
        const personIds = [...new Set((personLinks.data ?? []).map(link => link.person_id))];
        const named = personIds.length ? await supabase.from("congregation_people").select("id,full_name").in("id", personIds) : { data: [], error: null };
        if (!active) return;
        if (!named.error) names = Object.fromEntries((named.data ?? []).map(person => [person.id, person.full_name]));
        setPeopleProblem(!!personLinks.error || !!named.error);
        if (!personLinks.error) setPeople(summarisePersonLinks(personLinks.data ?? [], names));
        if (result.error) { setProblem(refreshProblem(result.status, result.error.code)); return; }
        setContacts(result.data ?? []); setUpdatedAt(new Date()); setProblem("");
      } catch { if (active) setProblem(refreshProblem(0)); }
      finally { if (active) setRefreshing(false); }
    }
    void load();
    const timer = window.setInterval(() => setRevision(value => value + 1), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [revision, refreshKey]);
  const visible = contacts ? filterDirectory(contacts, { query, program, relationship, attendance }) : [];
  const time = updatedAt?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return <section className="space-y-4 rounded-2xl border border-purple-100 bg-white p-5">
    <h2 className="font-serif text-2xl">Past program contacts</h2>
    <p className="text-sm text-slate-600">Search ILPC and Mighty Turn Around registrations. Confirm permission with the person before creating a follow-up. Newsletter preferences require separate confirmation.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label>Find a contact<input type="search" value={query} onChange={event => setQuery(event.target.value)} className={field} /></label>
      <label>Program<select value={program} onChange={event => setProgram(event.target.value)} className={field}><option value="">All programs</option><option value="ILPC">ILPC</option><option value="MTA">Mighty Turn Around</option></select></label>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label>Ministry relationship<select value={relationship} onChange={event => setRelationship(event.target.value)} className={field}><option value="">All relationships</option>{Object.entries(relationshipLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Attendance<select value={attendance} onChange={event => setAttendance(event.target.value)} className={field}><option value="">All attendance</option><option value="mta_attended">MTA attendance confirmed</option><option value="unknown">Attendance unknown</option></select></label>
    </div>
    <p className="text-sm text-slate-600">Matches refresh every minute. Member confirmation requires a reviewed membership profile with matching email and phone. Worker matches use assigned staff accounts. Attendance uses recorded MTA check-ins. Shared or changed details go to review.</p>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={refreshing} onClick={() => setRevision(value => value + 1)} className="min-h-11 rounded-lg border border-purple-200 px-4 disabled:opacity-50">{refreshing ? "Refreshing…" : "Refresh contacts"}</button>
      {time && <p className="text-sm text-slate-600">Updated {time}</p>}
    </div>
    {problem && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{problem}{contacts && time ? ` Showing results from ${time}.` : ""}</p>}
    {linkProblem && <p className="text-sm text-amber-900">Follow-up status could not load.</p>}
    {peopleProblem && <p className="text-sm text-amber-900">Linked people could not load.</p>}
    {!contacts ? (!problem && <p role="status">Loading program contacts…</p>) : <>
      <p role="status" className="text-sm text-slate-600">{visible.length} matching contacts</p>
      <ul className="space-y-3">{visible.map(contact => { const status = linkStatus(links[contact.import_key]); return <li key={contact.import_key} className="rounded-xl border border-purple-100 p-4">
        <h3 className="font-semibold">{contact.display_name}</h3>
        <p className="break-all text-sm">{contact.email}</p>
        {contact.phone_original && <p className="text-sm">{contact.phone_original}</p>}
        <p className="text-sm text-slate-600">{contact.programs.map(value => value === "MTA" ? "Mighty Turn Around" : value).join(" · ")}</p>
        <ul className="mt-1 text-sm">{describeEvidence(contact).map(line => <li key={line}>{line}</li>)}</ul>
        {status.text && <p className="mt-1 text-sm font-semibold">{status.text}</p>}
        {contact.relationship === "review" ? <p className="mt-2 text-sm text-amber-900">Contact details need review before follow-up.</p> : status.canPrepare && <button type="button" onClick={() => onChoose({ importKey: contact.import_key, name: contact.display_name, phone: contact.phone_original })} className="mt-3 min-h-11 rounded-lg border border-purple-200 px-4">Prepare follow-up</button>}
        {!peopleProblem && <PersonLinkPanel contactKey={contact.import_key} contactName={contact.display_name} linked={people[contact.import_key]} onChanged={() => setRevision(value => value + 1)} />}
      </li>; })}</ul>
      {!visible.length && <p>No matching contacts.</p>}
    </>}
  </section>;
}
