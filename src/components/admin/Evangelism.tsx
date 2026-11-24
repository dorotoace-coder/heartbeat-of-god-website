"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import OutreachFollowupCard, { type OutreachFollowup } from "./OutreachFollowupCard";

type Worker = { user_id: string; full_name: string };
type Contact = { invited:boolean; name: string; phone: string; address: string; permission:boolean; due:string; worker:string };
const empty = (): Contact => ({invited:false,name:"",phone:"",address:"",permission:false,due:"",worker:""});
const field = "block w-full rounded-lg border p-2";
export default function Evangelism() {
  const [rows,setRows] = useState<Contact[]>([]);
  const [workers,setWorkers] = useState<Worker[]>([]);
  const [queue,setQueue] = useState<OutreachFollowup[]>([]);
  const [closed,setClosed] = useState<OutreachFollowup[]>([]);
  const [visits,setVisits] = useState<{id:string;location:string;visit_date:string;people_reached:number}[]>([]);
  const [status,setStatus] = useState("");
  const [busy,setBusy] = useState(false);
  const [pastor,setPastor] = useState(false);
  const [revision,refresh] = useState(0);
  const visitId = useRef<string|null>(null);
  useEffect(() => {
    let active=true;
    async function load() {
      const [team, tasks, done, history, access] = await Promise.all([
        supabase.from("outreach_workers").select("user_id,full_name").order("full_name"),
        supabase.from("outreach_contacts").select("id,full_name,phone,address,followup_date,assigned_to,completed_at,closure_outcome").not("followup_date","is",null).is("completed_at",null).order("followup_date"),
        supabase.from("outreach_contacts").select("id,full_name,phone,address,followup_date,assigned_to,completed_at,closure_outcome").not("completed_at","is",null).order("completed_at",{ascending:false}).limit(20),
        supabase.from("outreach_visits").select("id,location,visit_date,people_reached").order("visit_date",{ascending:false}).limit(30),
        supabase.rpc("staff_workspace")
      ]);
      if(!active) return;
      if(team.error || tasks.error || done.error || history.error || access.error) {setStatus("Outreach records could not load. Refresh to retry."); return;}
      setPastor(access.data==="pastor");
      setWorkers(team.data); setQueue(tasks.data); setClosed(done.data); setVisits(history.data);
    }
    void load(); return ()=>{active=false;};
  },[revision]);
  function edit(index:number,change:Partial<Contact>) {
    setRows(list=>list.map((r,i)=>i===index?{...r,...change}:r));
  }
  async function save(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form=e.currentTarget, data=new FormData(form);
    if(rows.length>Number(data.get("reached"))) {setStatus("Total reached must include everyone listed.");return;}
    visitId.current ??= crypto.randomUUID();
    setBusy(true);
    try {
      const r=await supabase.rpc("record_outreach",{p_id:visitId.current,p_date:data.get("date"),p_location:data.get("location"),p_reached:Number(data.get("reached")),p_contacts:rows.map(c=>({...c,due:c.due||null,worker:c.worker||null}))});
      if(r.error) throw r.error;
      form.reset(); setRows([]); visitId.current=null; refresh(n=>n+1); setStatus("Visit saved.");
    } catch {setStatus("Could not confirm the save. Review the form and retry.");} finally {setBusy(false);}
  }
  async function importSheet(file:File) {
    if(file.size>500000){setStatus("Choose a smaller spreadsheet export.");return;}
    const lines=(await file.text()).replace(/^\uFEFF/,"").trim().split(/\r?\n/);
    if(lines.shift()?.trim().toLowerCase()!=="name\tphone\taddress"){setStatus("Use the three column headers: name, phone, address. Export as tab-separated text.");return;}
    const items=lines.filter(Boolean).map(line=>line.split("\t"));
    if(items.some(c=>c.length!==3 || !c[0].trim())) {setStatus("Each row needs three columns and a name.");return;}
    setRows(list=>[...list,...items.map(([name,phone,address])=>({...empty(),name,phone,address}))]);
    setStatus("Review the imported rows and confirm contact permission before saving.");
  }
  async function addWorker(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=event.currentTarget, values=new FormData(form);
    setBusy(true);
    const result=await supabase.rpc("register_outreach_worker",{p_email:values.get("email"),p_name:values.get("name")});
    setBusy(false);
    setStatus(result.error?"Worker could not be added. Check that the sign-in is confirmed and has no other department.":"Outreach worker added.");
    if(!result.error) {form.reset();refresh(n=>n+1);}
  }
  return <section className="grid gap-5 rounded-3xl bg-[#f7f4f8] p-4 text-slate-950 sm:p-7">
    <header className="rounded-2xl bg-[#2e1252] p-6 text-white">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">Win · Build · Send</p>
      <h2 className="mt-2 font-serif text-3xl">Evangelism</h2><a href="/partnership?area=salvation-challenge" className="mt-3 inline-flex min-h-11 items-center text-sm text-white underline">Salvation Challenge partnership</a>
      <p className="mt-2 max-w-xl text-sm text-purple-100">Prepare, record a visit, and make sure each promised follow-up reaches a person.</p>
    </header>
    <details className="rounded-2xl border border-purple-100 bg-white p-5"><summary className="cursor-pointer font-semibold">A simple guide to sharing Christ</summary>
      <ol className="list-decimal space-y-2 py-3 pl-6"><li>Ask permission: “Could I share briefly what my faith in Jesus means to me?” Listen to their answer.</li>
      <li>Read John 3:16 together. Ask, “What stands out to you about how God loves the world?”</li>
      <li>Use 1 Corinthians 15:3–4 to explain Christ’s death and resurrection. Share a short example from your own life.</li>
      <li>Ask, “Would you like to trust Christ or talk about a question first?” Offer prayer if they wish. Ask separately whether they would welcome another conversation.</li></ol></details>
    {pastor && <form onSubmit={addWorker} className="grid gap-3 rounded-2xl border border-purple-100 bg-white p-5 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">Assign an outreach worker</h3>
      <label>Name<input className={field} name="name" required maxLength={160}/></label>
      <label>Confirmed sign-in email<input className={field} name="email" type="email" required/></label>
      <button disabled={busy} className="rounded-lg bg-[#2e1252] px-4 py-3 text-white disabled:opacity-50">Add worker</button>
    </form>}
    <form onSubmit={save} className="rounded-2xl border border-purple-100 bg-white p-5"><fieldset disabled={busy} className="grid gap-3"><legend className="text-lg font-semibold">Record an outreach visit</legend>
      <label>Date<input className={field} type="date" name="date" required/></label>
      <label>Where you went<input className={field} name="location" maxLength={200} required/></label>
      <label>People you spoke with, including unnamed visitors<input className={field} type="number" name="reached" min={rows.length} required/></label>
      <details><summary>Import paper records from a spreadsheet</summary><p>Use three columns named name, phone, address. Export as tab-separated text, then review each row below.</p>
      <input type="file" accept=".tsv,.txt" onChange={e=>{const f=e.target.files?.[0];if(f) void importSheet(f);e.target.value="";}}/></details>
      {rows.map((r,i)=><fieldset className="grid gap-2 rounded-lg border p-3" key={i}><legend>Person {i+1}</legend>
        <label>Name<input className={field} value={r.name} required onChange={e=>edit(i,{name:e.target.value})}/></label>
        <label><input type="checkbox" checked={r.invited} onChange={e=>edit(i,{invited:e.target.checked})}/> Invited this person to trust Christ</label>
        <label><input type="checkbox" checked={r.permission} required={!!(r.phone||r.address||r.due)} onChange={e=>edit(i,{permission:e.target.checked})}/> Agreed to share contact details for follow-up</label>
        <label>Phone (optional)<input className={field} type="tel" value={r.phone} onChange={e=>edit(i,{phone:e.target.value})}/></label>
        <label>Address (optional)<input className={field} value={r.address} onChange={e=>edit(i,{address:e.target.value})}/></label>
        <label>Follow-up date (optional)<input className={field} type="date" value={r.due} onChange={e=>edit(i,{due:e.target.value,worker:e.target.value?r.worker:""})}/></label>
        {r.due && <label>Follow-up worker<select className={field} value={r.worker} required onChange={e=>edit(i,{worker:e.target.value})}><option value="">Choose a worker</option>{workers.map(w=><option key={w.user_id} value={w.user_id}>{w.full_name}</option>)}</select></label>}
        <button type="button" onClick={()=>setRows(list=>list.filter((_,j)=>i!==j))}>Remove from draft</button>
      </fieldset>)}
      <button className="rounded-lg border border-purple-800 px-4 py-3 text-purple-900" type="button" onClick={()=>setRows(list=>[...list,empty()])}>Add a person</button><button className="rounded-lg bg-[#2e1252] p-3 font-semibold text-white">Save visit</button>
    </fieldset></form><p role="status">{status}</p>
    <h3 className="text-lg font-semibold">Follow-up list</h3>
    {!queue.length && <p>No open follow-ups visible.</p>}
    {queue.map(t=><OutreachFollowupCard key={t.id} contact={t} workers={workers} onSaved={()=>refresh(n=>n+1)} />)}
    <h3 className="text-lg font-semibold">Recently closed follow-ups</h3>
    {!closed.length && <p>No closed follow-ups visible.</p>}
    {closed.map(t=><OutreachFollowupCard key={t.id} contact={t} workers={workers} onSaved={()=>refresh(n=>n+1)} />)}
    <h3 className="text-lg font-semibold">Recent visits</h3>{visits.map(v=><p className="rounded-xl bg-white p-3" key={v.id}>{v.visit_date} · {v.location} · {v.people_reached} reached</p>)}
  </section>;
}
