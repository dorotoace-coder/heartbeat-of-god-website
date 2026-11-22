"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Staff = {
  user_id: string;
  email: string;
  full_name: string;
  department: string;
  account_confirmed: boolean;
  last_sign_in_at: string | null;
};

const labels: Record<string, string> = {
  pastor: "Pastor",
  treasury_leader: "Treasury Leader",
  service_lead: "Service Lead",
  attendance: "Attendance and people intake",
  media: "Media Vault",
  foundation_school: "Foundation School",
  evangelism: "Evangelism",
  multiple_assignments: "Multiple assignments — review",
};

export default function PastorStaffAccess() {
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let current = true;
    async function load() {
      const result = await supabase.rpc("pastor_staff_access");
      if (!current) return;
      setError(!!result.error);
      setStaff(result.error ? null : result.data ?? []);
    }
    void load();
    return () => { current = false; };
  }, [revision]);

  return <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="staff-access-title">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-700">Private oversight</p>
        <h2 id="staff-access-title" className="mt-1 font-serif text-2xl text-[#2e1252]">Staff access</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Assigned department, confirmed email, and last recorded sign-in. A past sign-in does not mean the person is online now.</p></div>
      <button type="button" onClick={() => { setStaff(null); setRevision(value => value + 1); }}
        className="min-h-11 rounded-xl border border-purple-200 px-4 text-sm font-semibold text-purple-900">Refresh</button>
    </div>
    {error ? <p role="alert" className="mt-5 text-sm text-red-800">Staff access could not load. Try refreshing.</p> :
      staff === null ? <p role="status" className="mt-5 text-sm text-slate-600">Loading staff access…</p> :
      staff.length === 0 ? <p className="mt-5 text-sm text-slate-600">No assigned staff accounts were found.</p> :
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {staff.map(person => <li key={person.user_id} className="rounded-2xl border border-purple-100 bg-[#faf8fc] p-4">
          <p className="font-semibold text-slate-950">{person.full_name}</p>
          <p className="break-all text-sm text-slate-600">{person.email}</p>
          <p className="mt-3 text-sm font-semibold text-purple-950">{labels[person.department] ?? person.department}</p>
          <p className="mt-1 text-sm text-slate-600">{person.account_confirmed ? "Email confirmed" : "Email not confirmed"}</p>
          <p className="mt-1 text-sm text-slate-600">Last sign-in: {person.last_sign_in_at ? new Date(person.last_sign_in_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) + " (your device time)" : "No sign-in recorded"}</p>
        </li>)}
      </ul>}
  </section>;
}
