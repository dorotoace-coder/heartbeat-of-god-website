'use client';

import Image from 'next/image';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Heart, Plus, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { canAccess, initialCases, milestones, newCase, registryBlockers, sections, type MarriageCase, type Lane, type Role, type Section } from '@/lib/marriages/model';
import s from './marriages.module.css';

function Field({ label, children, full=false }: { label: string; children: ReactNode; full?: boolean }) { return <label className={`${s.field} ${full?s.full:''}`}>{label}{children}</label>; }
function Check({ name, label, checked=false }: { name:string; label:string; checked?:boolean }) { return <label className={s.check}><input type="checkbox" name={name} defaultChecked={checked}/><span>{label}</span></label>; }
function text(data:FormData,name:string) { return String(data.get(name)??'').trim(); }

export default function MarriageWorkspace() {
  const [cases,setCases]=useState(initialCases);
  const [selected,setSelected]=useState<string|null>(null);
  const [section,setSection]=useState<Section>('Overview');
  const [role,setRole]=useState<Role>('Counsellor');
  const [view,setView]=useState<'workspace'|'welcome'>('workspace');
  const [creating,setCreating]=useState(false);
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('All');
  const [message,setMessage]=useState('');
  const [errors,setErrors]=useState<string[]>([]);
  const c=cases.find(x=>x.id===selected);
  const resetFeedback=()=>{setMessage('');setErrors([]);};
  function update(patch:Partial<MarriageCase>,note:string) {
    if(!c) return;
    setCases(prev=>prev.map(item=>item.id===c.id?{...item,...patch,history:[note,...item.history]}:item));
    setMessage('Updated in this preview only. Reloading clears changes.');setErrors([]);
  }
  function open(id:string) {setSelected(id);setSection('Overview');setCreating(false);resetFeedback();}
  function create(e:FormEvent<HTMLFormElement>) {
    e.preventDefault(); const d=new FormData(e.currentTarget);
    if(!d.has('consent')) {setErrors(['Acknowledge the sample privacy notice before continuing.']);return;}
    const name=text(d,'names'); if(!name) return;
    const item=newCase(crypto.randomUUID(),name,text(d,'lane') as Lane);
    item.language=text(d,'language');item.contact=text(d,'contact');item.safeContact=text(d,'safeContact');item.consent=true;
    setCases(prev=>[item,...prev]);setSelected(item.id);setCreating(false);setView('workspace');setSection('Overview');
    setMessage('Sample enquiry created. Nothing has been sent or saved to a database.');setErrors([]);
  }
  const activeCount=cases.filter(x=>x.stage!=='Closed').length;
  const entriesCount=cases.reduce((n,x)=>n+x.entries.filter(e=>e.state==='Planned').length,0);
  const visible=cases.filter(x=>(filter==='All'||x.lane===filter)&&x.names.toLowerCase().includes(query.toLowerCase()));

  function renderCreate() { return <section className={s.panel}>
    <div className={s.toolbar}><div><h2>Start a conversation</h2><p className={s.muted}>You can enquire on your own. Your partner does not need an account.</p></div><button className={s.secondary} onClick={()=>{setCreating(false);resetFeedback();}}>Cancel</button></div>
    <div className={s.notice}>Preview form · Use invented details only. This form does not contact the ministry.</div>
    <form onSubmit={create}>
      <div className={s.grid}>
        <Field label="Preferred name(s)"><input name="names" required maxLength={100} placeholder="Sample person or couple"/></Field>
        <Field label="What would you like support with?"><select name="lane"><option>Premarital</option><option>Marriage enrichment</option><option>Personal support</option></select></Field>
        <Field label="Preferred language"><input name="language" defaultValue="English" maxLength={80}/></Field>
        <Field label="Safe contact method"><input name="contact" required placeholder="Example: participant initiates contact" maxLength={120}/></Field>
        <Field label="Contact preferences" full><textarea name="safeContact" placeholder="When and how would you prefer to be contacted?" maxLength={500}/></Field>
      </div>
      <Check name="consent" label="I understand this is a demonstration. I will use fictional information only."/>
      <button className={s.primary} type="submit">Create sample enquiry <ArrowRight size={16}/></button>
    </form>
  </section>; }

  function renderOverview() { if(!c) return null; return <>
    <section className={s.panel}><div className={s.toolbar}><div><span className={s.kicker}>Your care journey</span><h2>{c.names}</h2><p className={s.muted}>{c.lane} · {c.language}</p></div><span className={s.badge}>{c.stage}</span></div>
      <div className={s.grid}>
        <div><h3>Next appointment</h3><p className={s.muted}>{c.entries.find(e=>e.kind==='Session'&&e.state==='Planned')?.title??'No appointment scheduled'}</p></div>
        <div><h3>Contact preference</h3><p className={s.muted}>{c.safeContact||'Confirm before contacting'}</p></div>
      </div>
      <p className={s.muted}>Each person has their own record. Shared progress and private conversations remain separate in the proposed service.</p>
      {role==='Counsellor'&&<div className={s.controls}>
        <button className={s.secondary} onClick={()=>update({stage:c.stage==='Closed'?'Enquiry':'Closed'},c.stage==='Closed'?'Sample case reopened':'Sample case closed')}>{c.stage==='Closed'?'Reopen sample case':'Close sample case'}</button>
        <button className={s.primary} onClick={()=>setSection('RTT & preparation')}>Open RTT & preparation <ArrowRight size={16}/></button>
      </div>}
    </section>
    {role==='Counsellor'&&<section className={s.panel}><h2>Activity</h2><p className={s.muted}>An in-memory demonstration of the case timeline.</p>{c.history.map((h,i)=><div className={s.activity} key={`${i}-${h}`}>{h}</div>)}</section>}
  </>; }

  function renderEntries(kind:'Family visit'|'Session') { if(!c)return null; const list=c.entries.filter(x=>x.kind===kind);return <section className={s.panel}>
    <h2>{kind==='Family visit'?'Introductions & family visits':'Appointments & sessions'}</h2>
    <p className={s.muted}>{kind==='Family visit'?'Keep introductions, family meetings and agreed next steps together.':'Record appointments and attendance. Confidential session notes are not collected in this prototype.'}</p>
    {list.length===0?<div className={s.empty}>No {kind==='Family visit'?'family visits':'sessions'} recorded yet.</div>:list.map(entry=><div className={s.caseRow} key={entry.id}><div><div className={s.caseName}>{entry.title}</div><p className={s.muted}>{entry.date} · {entry.state}</p>{role==='Counsellor'&&<p className={s.muted}>{entry.detail}</p>}</div>{entry.state==='Planned'&&<button className={s.secondary} onClick={()=>update({entries:c.entries.map(x=>x.id===entry.id?{...x,state:'Completed'}:x)},`${kind} marked completed`)}>Mark completed</button>}</div>)}
    <form key={`${c.id}-${kind}-${c.entries.length}`} onSubmit={e=>{
      e.preventDefault();const d=new FormData(e.currentTarget);
      if(kind==='Family visit'&&!d.has('permission')){setErrors(['Confirm permission for the planned family contact.']);return;}
      update({entries:[...c.entries,{id:crypto.randomUUID(),kind,date:text(d,'date'),title:text(d,'title'),detail:text(d,'detail'),state:'Planned'}]},`${kind} added`);
    }}>
      <h3 style={{marginTop:28}}>Add {kind==='Family visit'?'a visit':'an appointment'}</h3>
      <div className={s.grid}>
        <Field label="Title"><input name="title" required maxLength={100} placeholder={kind==='Family visit'?'Family introduction':'Individual conversation'}/></Field>
        <Field label="Date"><input name="date" type="date" required/></Field>
        <Field label={kind==='Family visit'?'Attendees, agreed outcome or next action (fictional only)':'Time, timezone and meeting channel'} full><textarea name="detail" maxLength={700} placeholder={kind==='Family visit'?'Record only the agreed summary.':'Example: 19:00 Africa/Lagos · online'}/></Field>
      </div>
      {kind==='Family visit'&&<Check name="permission" label="Permission for this family contact has been confirmed in the sample scenario."/>}
      <button className={s.primary} type="submit"><Plus size={16}/>Add {kind==='Family visit'?'visit':'appointment'}</button>
    </form>
  </section>; }

  function renderBackground() { if(!c)return null;return <section className={s.panel}><h2>Background & family context</h2><p className={s.muted}>Record what is relevant, at the person’s pace. Unknown and not applicable are valid answers.</p>
    <form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);update({background:{priorUnion:text(d,'priorUnion'),evidence:text(d,'evidence'),dependants:text(d,'dependants'),customs:text(d,'customs'),accessibility:text(d,'accessibility')}},'Background summary updated');}}>
      <div className={s.grid}>
        <Field label="Previous union / marriage history"><select name="priorUnion" defaultValue={c.background.priorUnion}>{['Not yet discussed','No previous union reported','Existing customary union with this partner','Previous marriage — review needed','Widowed','Separated — review needed','Prefer to discuss privately'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Supporting evidence"><select name="evidence" defaultValue={c.background.evidence}>{['Not reviewed','Not applicable','Awaiting evidence','Reviewed — follow-up required','Reviewed by authorised person'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Dependants / family responsibilities (optional)" full><textarea name="dependants" defaultValue={c.background.dependants} maxLength={700}/></Field>
        <Field label="Couple-selected customs and family expectations (optional)" full><textarea name="customs" defaultValue={c.background.customs} maxLength={700}/></Field>
        <Field label="Language, interpreter or accessibility needs (optional)" full><textarea name="accessibility" defaultValue={c.background.accessibility} maxLength={500}/></Field>
      </div><button className={s.primary} type="submit">Update sample background</button>
    </form>
  </section>; }

  function renderWellbeing() { if(!c)return null;return <section className={s.panel}><h2>Wellbeing & referrals</h2><p className={s.muted}>Support the person without turning counselling into a medical record.</p><div className={s.notice}>No laboratory reports, diagnoses or health scores are collected here. Medical questions belong with a qualified clinician.</div>
    <form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);const permission=d.has('permission');if(text(d,'status')!=='Not requested'&&!permission){setErrors(['Record permission before adding an active referral.']);return;}update({wellbeing:{permission,referral:text(d,'referral'),status:text(d,'status')}},'Referral metadata updated');}}>
      <div className={s.grid}><Field label="Referral reference (fictional only)"><input name="referral" defaultValue={c.wellbeing.referral} maxLength={120} placeholder="Sample provider or reference"/></Field><Field label="Status"><select name="status" defaultValue={c.wellbeing.status}>{['Not requested','Requested','Appointment arranged','Follow-up agreed','Closed'].map(x=><option key={x}>{x}</option>)}</select></Field></div>
      <Check name="permission" checked={c.wellbeing.permission} label="The person has agreed to this referral in the sample scenario."/>
      <button className={s.primary}>Update sample referral</button>
    </form></section>; }

  function renderPreparation() { if(!c)return null;return <section className={s.panel}><span className={s.kicker}>Right Time Test</span><h2>Preparation, with care</h2><p className={s.muted}>A shared view of progress. Completing a checklist does not grant permission to conduct a wedding.</p>
    <div className={s.progress}><span style={{width:`${c.preparation.length/milestones.length*100}%`}}/></div>
    <p className={s.muted}>{c.preparation.length} of {milestones.length} sample milestones completed</p>
    {milestones.map(m=><label className={s.check} key={m}><input type="checkbox" checked={c.preparation.includes(m)} onChange={e=>update({preparation:e.target.checked?[...c.preparation,m]:c.preparation.filter(x=>x!==m),stage:c.stage==='Enquiry'?'Preparation':c.stage},'Preparation checklist updated')}/><span>{m}</span></label>)}
    <div className={s.notice}><ShieldCheck size={18} style={{display:'inline',marginRight:8}}/>RTT questionnaire integration is not active. Existing answers and sealed files have not been imported.</div>
  </section>; }

  function renderWedding() { if(!c)return null;const w=c.wedding;return <section className={s.panel}><h2>Wedding & register</h2><p className={s.muted}>Keep ceremony planning separate from verified official records.</p>
    <span className={s.badge}>{w.status}</span>
    <form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);const wedding={...w,kind:text(d,'kind'),country:text(d,'country'),region:text(d,'region'),venue:text(d,'venue'),date:text(d,'date'),actualDate:text(d,'actualDate'),officiant:text(d,'officiant'),witnesses:text(d,'witnesses'),authority:d.has('authority'),eligibility:d.has('eligibility'),evidence:text(d,'evidence'),receipt:text(d,'receipt'),acknowledgement:text(d,'acknowledgement'),status:text(d,'status') as typeof w.status};const blockers=registryBlockers({...c,wedding},wedding.status);if(blockers.length){setErrors(blockers);setMessage('');return;}update({wedding},'Wedding record updated');}}>
      <div className={s.grid}>
        <Field label="Ceremony type"><select name="kind" defaultValue={w.kind}>{['Church ceremony','Customary ceremony','Existing civil marriage','Blessing / vow renewal'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Record status"><select name="status" defaultValue={w.status}>{['Planning','Ceremony recorded','Return submitted','Verified'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Country"><input name="country" defaultValue={w.country} maxLength={80}/></Field>
        <Field label="State / province / registry district"><input name="region" defaultValue={w.region} maxLength={120}/></Field>
        <Field label="Venue" full><input name="venue" defaultValue={w.venue} maxLength={200}/></Field>
        <Field label="Proposed date"><input type="date" name="date" defaultValue={w.date}/></Field>
        <Field label="Actual ceremony date"><input type="date" name="actualDate" defaultValue={w.actualDate}/></Field>
        <Field label="Officiant"><input name="officiant" defaultValue={w.officiant} maxLength={100}/></Field>
        <Field label="Witness references"><input name="witnesses" defaultValue={w.witnesses} maxLength={150}/></Field>
      </div>
      <h3>Internal verification</h3><p className={s.muted}>Visible in this staff preview only. Official requirements must be confirmed for the particular ceremony.</p>
      <Check name="authority" checked={w.authority} label="Venue and officiant authority reviewed (simulation)."/>
      <Check name="eligibility" checked={w.eligibility} label="Required eligibility documents reviewed (simulation)."/>
      <div className={s.grid}>
        <Field label="Reviewed evidence reference" full><input name="evidence" defaultValue={w.evidence} maxLength={150}/></Field>
        <Field label="Submission receipt reference"><input name="receipt" defaultValue={w.receipt} maxLength={150}/></Field>
        <Field label="Official acknowledgement reference"><input name="acknowledgement" defaultValue={w.acknowledgement} maxLength={150}/></Field>
      </div>
      <button className={s.primary}>Update sample wedding record</button>
      <p className={s.footer}>No government submission or certificate is generated by this preview.</p>
    </form>
  </section>; }

  function renderAftercare() { if(!c)return null;return <section className={s.panel}><h2>Care beyond the wedding</h2><p className={s.muted}>Agree the next check-in together. Nothing is sent automatically.</p>
    <form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);const permission=d.has('permission');if(text(d,'date')&&!permission){setErrors(['Agree follow-up permission before scheduling a check-in.']);return;}update({aftercare:{permission,date:text(d,'date'),channel:text(d,'channel'),goal:role==='Counsellor'?text(d,'goal'):c.aftercare.goal}},'Aftercare plan updated');}}>
      <Check name="permission" checked={c.aftercare.permission} label="The participant has agreed to follow-up in this sample scenario."/>
      <div className={s.grid}><Field label="Next check-in"><input type="date" name="date" defaultValue={c.aftercare.date}/></Field><Field label="Agreed channel"><input name="channel" defaultValue={c.aftercare.channel} maxLength={120}/></Field>{role==='Counsellor'&&<Field label="Agreed focus (optional)" full><textarea name="goal" defaultValue={c.aftercare.goal} maxLength={500}/></Field>}</div>
      <button className={s.primary}>Update sample aftercare</button>
    </form></section>; }

  return <div className={s.shell}>
    <div className={s.banner}>LOCAL DESIGN PREVIEW · Fictional records only · Changes reset on reload · No emails or database writes</div>
    <header className={s.header}><div className={s.brand}><Image src="/hbg-logo-premium.png" alt="Heartbeat of God" width={1200} height={633} priority/><div><strong>HBG Pulse OS</strong><p className={s.muted}>Heartbeat Marriages</p></div></div>
      <div className={s.controls}><button className={s.secondary} onClick={()=>{setView(view==='workspace'?'welcome':'workspace');setCreating(false);resetFeedback();}}>{view==='workspace'?'Member welcome preview':'Staff workspace preview'}</button>{view==='workspace'&&<label className={s.field}>Simulate view<select value={role} onChange={e=>{setRole(e.target.value as Role);setSection('Overview');setCreating(false);resetFeedback();}}><option>Counsellor</option><option>Records officer</option><option>Coordinator</option></select></label>}</div>
    </header>
    <div className={s.layout}>
      <aside className={s.sidebar} aria-label="Marriage workspace sections">
        <button aria-current={!c||view==='welcome'?'page':undefined} onClick={()=>{setSelected(null);setCreating(false);resetFeedback();}}>Marriage & Counselling</button>
        {c&&view==='workspace'&&sections.filter(x=>canAccess(role,x)).map(x=><button key={x} aria-current={section===x?'page':undefined} onClick={()=>{setSection(x);setCreating(false);resetFeedback();}}>{x}</button>)}
        <div className={s.sideNote}><Heart size={19}/><p style={{marginTop:12}}>A place to prepare.<br/>A space to grow.<br/>Care for the journey.</p></div>
      </aside>
      <main id="main-content" className={s.main}>
        <div className={s.hero}><div><p className={s.kicker}>Heartbeat Marriages</p><h1>{view==='welcome'?'Build a life, together.':c?'Care for every chapter.':'Every journey matters.'}</h1><p className={s.muted}>{view==='welcome'?'Marriage preparation, meaningful conversations and ongoing support.':'Marriage & Counselling · A thoughtful space for people, preparation and care.'}</p></div><div className={s.orbit} aria-hidden="true"><Heart size={42} strokeWidth={1.2}/></div></div>
        {message&&<div className={s.notice} role="status">{message}</div>}
        {errors.length>0&&<div className={s.alert} role="alert">{errors.map(x=><p key={x}>{x}</p>)}</div>}
        {creating?renderCreate():view==='welcome'?<>
          <section className={s.panel}><h2>Wherever you are in the journey</h2><p className={s.muted}>Preparing for marriage, strengthening a relationship or looking for a personal conversation? There is room to begin at your own pace.</p><div className={s.grid}><div><h3>Before the vow</h3><p className={s.muted}>Explore expectations and prepare through the Right Time Test and guided conversations.</p></div><div><h3>Beyond the wedding</h3><p className={s.muted}>Make space for connection, growth and continued support.</p></div></div><button className={s.primary} onClick={()=>setCreating(true)}>Try a sample enquiry <ArrowRight size={16}/></button></section>
          <section className={s.panel}><h2>Your story, your pace</h2><p className={s.muted}>Enquire alone or as a couple. Share your preferred language, accessibility needs and safe way to contact you. Family involvement is discussed with you.</p></section>
        </>:!c?<>
          <div className={s.stats}><div className={s.stat}><b>{activeCount}</b>Sample active journeys</div><div className={s.stat}><b>{entriesCount}</b>Planned activities</div><div className={s.stat}><b>{cases.filter(x=>x.aftercare.permission).length}</b>Agreed follow-ups</div></div>
          {role==='Counsellor'&&<section className={s.panel}><div className={s.toolbar}><div><p className={s.kicker}>Right Time Test · RTT</p><h2>Before the vow, find the truth.</h2><p className={s.muted}>Explore the preparation workspace using a fictional couple.</p></div><button className={s.primary} onClick={()=>{const sample=cases.find(x=>x.lane==='Premarital');if(sample){open(sample.id);setSection('RTT & preparation');}}}>Open RTT preview <ArrowRight size={16}/></button></div><p className={s.muted}>Preparation checklist preview. The full RTT questionnaire and sealed answers are not connected yet.</p></section>}
          <section className={s.panel}><div className={s.toolbar}><h2>Care journeys</h2>{role==='Counsellor'&&<button className={s.primary} onClick={()=>{setCreating(true);resetFeedback();}}><Plus size={16}/>Sample enquiry</button>}</div>
            <label className={s.field}>Find a sample person or couple<input className={s.search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search names"/></label>
            <div className={s.tabs}>{['All','Premarital','Marriage enrichment','Personal support'].map(x=><button aria-pressed={filter===x} key={x} onClick={()=>setFilter(x)}>{x}</button>)}</div>
            {visible.length===0?<div className={s.empty}>No journeys match this search.</div>:visible.map(x=><div className={s.caseRow} key={x.id}><div><p className={s.caseName}>{x.names}</p><p className={s.muted}>{x.lane} · {x.language}</p></div><div className={s.controls}><span className={s.badge}>{x.stage}</span><button className={s.secondary} onClick={()=>open(x.id)} aria-label={`Open ${x.names}`}>Open <ArrowRight size={16}/></button></div></div>)}
          </section>
        </>:<>
          <div className={s.toolbar}><button className={s.secondary} onClick={()=>{setSelected(null);resetFeedback();}}><ArrowLeft size={15}/>All journeys</button><p className={s.muted}>{role} view · interface simulation, not live permissions</p></div>
          <div key={`${c.id}-${section}-${role}`}>{!canAccess(role,section)?<div className={s.empty}>This section is unavailable in this preview role.</div>:section==='Overview'?renderOverview():section==='Family visits'?renderEntries('Family visit'):section==='Background'?renderBackground():section==='Wellbeing'?renderWellbeing():section==='RTT & preparation'?renderPreparation():section==='Sessions'?renderEntries('Session'):section==='Wedding records'?renderWedding():renderAftercare()}</div>
        </>}
        <footer className={s.footer}>Private local prototype. All sample identities are fictional. No real case information should be entered.</footer>
      </main>
    </div>
  </div>;
}
