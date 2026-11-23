"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PeopleIntake from "./PeopleIntake";
import TrainingPersonSummary from "./TrainingPersonSummary";

type Person = { id: string; full_name: string; phone: string | null; address: string | null; social_contact: string | null; requests_school: boolean };
export default function PeopleDirectory() {
  const [people, setPeople] = useState<Person[]>([]);
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("Loading records…");
  useEffect(() => {
    let current = true;
    async function load() {
      const result = await supabase.from("congregation_people").select("id,full_name,phone,address,social_contact,requests_school").order("full_name");
      if (!current) return;
      setPeople(result.data ?? []);
      setStatus(result.error ? "The directory could not load." : "");
    }
    void load();
    return () => { current = false; };
  }, [revision]);
  const matches = people.filter(person => person.full_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <section className="grid gap-6"><PeopleIntake onSaved={() => setRevision(v => v + 1)} />
    <div className="rounded-2xl bg-white p-6 text-slate-900"><h2 className="text-xl font-semibold">Member directory</h2>
      <label>Find a person<input className="my-3 block w-full rounded border p-2" type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <p role="status">{status || (!matches.length ? "No matching records." : "")}</p>
      {matches.map(person => <details className="border-b py-3" key={person.id} onToggle={e=>{const open=e.currentTarget.open;setExpanded(previous=>({...previous,[person.id]:open}));}}><summary>{person.full_name}</summary>
        {person.phone && <p>Phone: {person.phone}</p>}{person.address && <p>Address: {person.address}</p>}
        {person.social_contact && <p>Social contact: {person.social_contact}</p>}{person.requests_school && <p>Interested in Foundation School</p>}
        {expanded[person.id] && <TrainingPersonSummary personId={person.id} />}
      </details>)}
    </div>
  </section>;
}
