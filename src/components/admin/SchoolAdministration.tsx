"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import FoundationSchool from "./FoundationSchool";

type Person = { id: string; full_name: string; requests_school?: boolean };
type ClassRow = { id: string; title: string; starts_on: string; teacher_id: string };
type Enrollment = { class_id: string; person_id: string; graduated_on: string | null };
const field = "block w-full rounded border px-3 py-2";

export default function SchoolAdministration() {
  const [teachers,setTeachers] = useState<Person[]>([]);
  const [people,setPeople] = useState<Person[]>([]);
  const [classes,setClasses] = useState<ClassRow[]>([]);
  const [enrollments,setEnrollments] = useState<Enrollment[]>([]);
  const [selected,setSelected] = useState("");
  const [revision,refresh] = useState(0);
  const [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false);
  const [status,setStatus] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const [staff, members, groups, registrations] = await Promise.all([
        supabase.from("foundation_teachers").select("id,full_name").order("full_name"),
        supabase.from("congregation_people").select("id,full_name,requests_school").order("full_name"),
        supabase.from("foundation_classes").select("id,title,starts_on,teacher_id").order("starts_on",{ascending:false}),
        supabase.from("foundation_students").select("class_id,person_id,graduated_on")
      ]);
      if (!active) return;
      if ([staff,members,groups,registrations].some(result => result.error)) {
        setReady(false); setStatus("School records could not be loaded. Refresh to retry."); return;
      }
      setTeachers(staff.data ?? []); setPeople(members.data ?? []); setClasses(groups.data ?? []);
      setEnrollments(registrations.data ?? []); setSelected(current => current || groups.data?.[0]?.id || "");
      setReady(true);
    }
    void load();
    return () => { active = false; };
  }, [revision]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const value = (key: string) => String(values.get(key) || "").trim();
    setBusy(true);
    try {
      let result;
      switch (form.name) {
        case "teacher":
          result = await supabase.rpc("register_foundation_teacher",{p_email:value("email"),p_name:value("name"),p_trained_on:value("date")}); break;
        case "class":
          if (new Date(value("date")+"T12:00:00Z").getUTCDay() !== 0) throw new Error("Choose a Sunday for the first class.");
          result = await supabase.from("foundation_classes").insert({title:value("name"),teacher_id:value("teacher"),starts_on:value("date")}).select("id").single();
          if (result.data) setSelected(result.data.id); break;
        case "enroll":
          result = await supabase.from("foundation_students").upsert({class_id:selected,person_id:value("person")},{onConflict:"class_id,person_id",ignoreDuplicates:true}); break;
        case "graduate":
          result = await supabase.from("foundation_students").update({graduated_on:value("date")}).eq("class_id",selected).eq("person_id",value("person")).select("person_id").single(); break;
        default: return;
      }
      if (result.error) throw new Error(result.error.message);
      form.reset(); setStatus("Saved."); refresh(n => n+1);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Save failed. Please retry."); }
    finally {setBusy(false);}
  }

  const enrolled = enrollments.filter(row => row.class_id === selected);
  const available = people.filter(p => !enrolled.some(row => row.person_id===p.id));
  const awaitingGraduation = enrolled.filter(row => !row.graduated_on);
  return <section className="grid gap-5">
    <div className="grid gap-4 rounded-2xl bg-white p-6 text-slate-900">
      <h2 className="text-2xl font-semibold">School administration</h2><p role="status">{status}</p>
      <fieldset disabled={!ready || busy} className="grid gap-5">
        <details><summary>Record a trained teacher</summary><form name="teacher" onSubmit={save} className="grid gap-2 py-3">
          <label>Teacher name<input className={field} name="name" required /></label>
          <label>Staff sign-in email<input className={field} name="email" type="email" required /></label>
          <label>Training completed<input className={field} name="date" type="date" required /></label><button>Save teacher</button>
        </form></details>
        <details><summary>Create a class</summary><form name="class" onSubmit={save} className="grid gap-2 py-3">
          <label>Class name<input className={field} name="name" required /></label>
          <label>First Sunday<input className={field} name="date" type="date" required /></label>
          <label>Assigned teacher<select className={field} name="teacher" required><option value="">Choose teacher</option>{teachers.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label>
          <button>Create class</button></form></details>
        {classes.length>0 && <><label>Manage class<select className={field} value={selected} onChange={e=>setSelected(e.target.value)}>{classes.map(c=><option key={c.id} value={c.id}>{c.title} · {c.starts_on}</option>)}</select></label>
        <form name="enroll" onSubmit={save}><label>Enroll a person<select name="person" required className={field}><option value="">Choose person</option>{available.map(p=><option key={p.id} value={p.id}>{p.full_name}{p.requests_school ? " · requested school" : ""}</option>)}</select></label><button>Enroll student</button></form>
        {awaitingGraduation.length>0 && <form name="graduate" onSubmit={save} className="grid gap-2"><label>Graduating student<select className={field} name="person" required><option value="">Choose student</option>{awaitingGraduation.map(e=><option key={e.person_id} value={e.person_id}>{people.find(p=>p.id===e.person_id)?.full_name}</option>)}</select></label><label>Graduation date<input className={field} name="date" type="date" required min={classes.find(c=>c.id===selected)?.starts_on} /></label><button>Record graduation</button></form>}</>}
      </fieldset>
    </div>
    <FoundationSchool key={revision}/>
  </section>;
}
