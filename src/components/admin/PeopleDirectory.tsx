"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import MemberProfileReview from "./MemberProfileReview";
import PeopleIntake from "./PeopleIntake";
import TrainingPersonSummary from "./TrainingPersonSummary";
import PersonRecords from "./PersonRecords";
import { isUnconfirmedDirectoryPerson, type PersonOrigin } from "@/lib/people/links";

type Person = { id: string; full_name: string; phone: string | null; address: string | null; social_contact: string | null; requests_school: boolean; origin?: PersonOrigin };
type Contact = {person_id:string;email:string;member_type:string;ministry_emails:boolean;partnership_invitations:boolean;reviewed_at:string|null};
export default function PeopleDirectory() {
  const [contacts,setContacts]=useState<Record<string,Contact>>({});
  const [people, setPeople] = useState<Person[]>([]);
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState("Loading records…");
  useEffect(() => {
    let current = true;
    async function load() {
      const [result,linked] = await Promise.all([
        supabase.from("congregation_people").select("id,full_name,phone,address,social_contact,requests_school,origin").order("full_name"),
        supabase.from("member_profile_intake").select("person_id,email,member_type,ministry_emails,partnership_invitations,reviewed_at").not("person_id","is",null),
      ]);
      if (!current) return;
      setPeople(result.data ?? []);
      setContacts(Object.fromEntries((linked.data??[]).map(row=>[row.person_id,row])));
      setStatus(result.error ? "The directory could not load." : linked.error ? "Contact preferences could not load. Please refresh." : "");
    }
    void load();
    return () => { current = false; };
  }, [revision]);
  const matches = people.filter(person => person.full_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <section className="grid gap-6"><MemberProfileReview directoryReady={status === ""} people={people} onReviewed={() => setRevision(v => v + 1)} /><PeopleIntake onSaved={() => setRevision(v => v + 1)} />
    <div className="rounded-2xl bg-white p-6 text-slate-900"><h2 className="text-xl font-semibold">Member directory</h2>
      <label>Find a person<input className="my-3 block w-full rounded border p-2" type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
      <p role="status">{status || (!matches.length ? "No matching records." : "")}</p>
      {matches.map(person => <details className="border-b py-3" key={person.id} onToggle={e=>{const open=e.currentTarget.open;setExpanded(previous=>({...previous,[person.id]:open}));}}><summary>{person.full_name}{isUnconfirmedDirectoryPerson(person.origin, !!contacts[person.id]?.reviewed_at && contacts[person.id].member_type === "member") && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">From program contacts · membership unconfirmed</span>}</summary>
        {person.phone && <p>Phone: {person.phone}</p>}{person.address && <p>Address: {person.address}</p>}
        {person.social_contact && <p>Social contact: {person.social_contact}</p>}{person.requests_school && <p>Interested in Foundation School</p>}
        {expanded[person.id] && <>{contacts[person.id]&&<div className="mt-3 rounded-lg bg-purple-50 p-3 text-sm">
          <p className="break-all">Account email: {contacts[person.id].email}</p>
          <p>Self-reported connection: {contacts[person.id].member_type}</p>
          <p>Ministry emails: {contacts[person.id].ministry_emails?"Opted in":"Not opted in"}</p>
          <p>Partnership invitations: {contacts[person.id].partnership_invitations?"Opted in":"Not opted in"}</p>
          {!contacts[person.id].reviewed_at&&<p>Latest profile changes await review.</p>}
        </div>}<PersonRecords personId={person.id} onRestored={() => setRevision(v => v + 1)} /><TrainingPersonSummary personId={person.id} /></>}
      </details>)}
    </div>
  </section>;
}
