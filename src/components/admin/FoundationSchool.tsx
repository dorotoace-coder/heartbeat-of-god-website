"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Student = { person_id: string; full_name: string };
type ClassRow = { id: string; title: string; starts_on: string };

function Register({ classId, week }: { classId: string; week: number }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("Loading register…");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      const [roster, roll] = await Promise.all([
        supabase.rpc("foundation_roster", { p_class: classId }),
        supabase.from("foundation_roll").select("person_id,present").eq("class_id", classId).eq("week", week)
      ]);
      if (!active) return;
      if (roster.error || roll.error) { setMessage("This register could not be loaded."); return; }
      setStudents(roster.data ?? []);
      setMarks(Object.fromEntries((roll.data ?? []).map(r => [r.person_id, r.present])));
      setMessage(roster.data?.length ? "" : "No students are enrolled in this class yet.");
      setReady(true);
    }
    void load();
    return () => { active = false; };
  }, [classId, week]);

  async function mark(student: Student, present: boolean) {
    setSaving(true);
    try {
      const result = await supabase.from("foundation_roll").upsert({
        class_id: classId, person_id: student.person_id, week, present
      }, { onConflict: "class_id,person_id,week" });
      if (result.error) throw result.error;
      setMarks(previous => ({ ...previous, [student.person_id]: present }));
      setMessage("Saved attendance for " + student.full_name + ".");
    } catch { setMessage("Could not confirm the change. Try again."); }
    finally { setSaving(false); }
  }

  return <div><p role="status">{message}</p>{ready && students.map(student => <fieldset key={student.person_id} disabled={saving} className="my-4 rounded-xl border p-3">
    <legend className="px-1 font-semibold">{student.full_name}</legend>
    <p>{marks[student.person_id] === undefined ? "Unmarked" : marks[student.person_id] ? "Present" : "Absent"}</p>
    <div className="mt-2 flex gap-2">{[true, false].map(value => <button key={String(value)} aria-pressed={marks[student.person_id] === value} onClick={() => mark(student,value)} className="rounded-lg border px-4 py-2 aria-pressed:bg-purple-900 aria-pressed:text-white">{value ? "Present" : "Absent"}</button>)}</div>
  </fieldset>)}</div>;
}

export default function FoundationSchool() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState("");
  const [week, setWeek] = useState(1);
  const [status, setStatus] = useState("Loading classes…");
  useEffect(() => {
    let active = true;
    async function load() {
      const result = await supabase.from("foundation_classes").select("id,title,starts_on").order("starts_on",{ascending:false});
      if (!active) return;
      setClasses(result.data ?? []);
      setClassId(result.data?.[0]?.id ?? "");
      setStatus(result.error ? "Classes could not be loaded." : result.data?.length ? "" : "No classes assigned yet.");
    }
    void load();
    return () => { active = false; };
  }, []);
  return <section className="grid gap-4 rounded-2xl bg-white p-6 text-slate-900">
    <h2 className="text-2xl font-semibold">Foundation School</h2>
    {status && <p role="status">{status}</p>}
    {classId && <><label>Class<select className="block w-full rounded border p-2" value={classId} onChange={e => {setClassId(e.target.value); setWeek(1);}}>
      {classes.map(c => <option value={c.id} key={c.id}>{c.title} · {c.starts_on}</option>)}</select></label>
      <label>Sunday<select className="block rounded border p-2" value={week} onChange={e => setWeek(Number(e.target.value))}>
        {[1,2,3,4].map(n => <option key={n} value={n}>Week {n}</option>)}</select></label>
      <Register key={classId + week} classId={classId} week={week} /></>}
  </section>;
}
