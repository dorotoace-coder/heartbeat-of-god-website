"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isZoomInvitation } from "@/lib/liveMeeting";

type Meeting = { program: string; title: string; audience: "public" | "restricted"; status: "active" | "inactive" | "upcoming"; invitation_url: string | null };
export default function LiveMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [message, setMessage] = useState("Loading meetings…");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let current = true;
    void supabase.from("live_meetings").select("program,title,audience,status,invitation_url").order("program").then(({ data, error }) => {
      if (!current) return;
      setMeetings(data ?? []); setMessage(error ? "Could not load meeting configuration." : "");
    });
    return () => { current = false; };
  }, []);
  function update(program: string, patch: Partial<Meeting>) {
    setMeetings(rows => rows.map(row => row.program === program ? { ...row, ...patch } : row));
    setMessage("");
  }
  async function save(meeting: Meeting) {
    const url = meeting.invitation_url?.trim() || null;
    if ((url && !isZoomInvitation(url)) || (meeting.status === "active" && !url)) {
      setMessage("Enter the complete official Zoom invitation URL before activating."); return;
    }
    setSaving(true); setMessage("");
    const { data, error } = await supabase.from("live_meetings").update({ status: meeting.status, invitation_url: url })
      .eq("program", meeting.program).select("program");
    setSaving(false);
    setMessage(error || data?.length !== 1 ? "Meeting could not be saved. Check your access and try again." : "Meeting saved. Changes apply immediately to new joining requests.");
  }
  return <section className="space-y-6"><h1 className="text-2xl font-semibold">Live Church meetings</h1>
    <p>Only Sunday service is connected to the public Live Church page. Other programs remain restricted. Availability is set manually and does not detect Zoom activity.</p>
    <p>Use the complete official invitation URL. Keep confidential meetings in separately configured rooms with appropriate access controls.</p>
    <p role="status">{message}</p>
    {meetings.map(meeting => <form key={meeting.program} className="space-y-4 rounded-xl border bg-white p-6" onSubmit={event => { event.preventDefault(); void save(meeting); }}>
      <h2 className="text-xl font-semibold">{meeting.title}</h2><p>{meeting.audience === "restricted" ? "Restricted meeting" : "Public Sunday service"}</p>
      <label className="block">Official invitation URL<input type="password" autoComplete="off" value={meeting.invitation_url ?? ""} onChange={event => update(meeting.program, { invitation_url: event.target.value })} className="mt-2 block w-full rounded border p-3" /></label>
      <label className="block">Meeting status<select value={meeting.status} onChange={event => update(meeting.program, { status: event.target.value as Meeting["status"] })} className="ml-3 rounded border p-3">
        <option value="inactive">Inactive</option><option value="upcoming">Upcoming</option><option value="active">Active — joining open</option>
      </select></label>
      <button disabled={saving} className="rounded bg-purple-900 px-5 py-3 text-white disabled:opacity-50">{saving ? "Saving…" : `Save ${meeting.title}`}</button>
    </form>)}
  </section>;
}
