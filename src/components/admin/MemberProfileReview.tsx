"use client";
import { useEffect,useState } from "react";
import { supabase } from "@/lib/supabase";
type Request={user_id:string;full_name:string;email:string;phone:string|null;address:string|null;member_type:string;department_id:string|null;ministry_emails:boolean;partnership_invitations:boolean;person_id:string|null};
export default function MemberProfileReview({people,onReviewed,directoryReady}:{people:{id:string;full_name:string}[];onReviewed:()=>void;directoryReady:boolean}){
 const [departments,setDepartments]=useState<Record<string,string>>({});
 const [requests,setRequests]=useState<Request[]>([]);const [links,setLinks]=useState<Record<string,string>>({});const [status,setStatus]=useState("Loading profile submissions…");const [busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;void supabase.from("departments").select("id,name").not("name","is",null).then(r=>{if(active)setDepartments(Object.fromEntries((r.data??[]).map(d=>[d.id,d.name])));});void supabase.from("member_profile_intake").select("user_id,full_name,email,phone,address,member_type,department_id,ministry_emails,partnership_invitations,person_id").is("reviewed_at",null).order("submitted_at").limit(100).then(r=>{if(active){setRequests(r.data??[]);setStatus(r.error?"Profile submissions could not load.":"");}});return()=>{active=false;};},[]);
 async function review(item:Request){
  if(busy||!directoryReady||!links[item.user_id])return;setBusy(true);
  try{const choice=links[item.user_id];const r=await supabase.rpc("review_member_profile",{p_user:item.user_id,p_person:item.person_id??(choice==="new"?null:choice)});if(r.error)throw r.error;
   setRequests(old=>old.filter(x=>x.user_id!==item.user_id));setStatus("Profile reviewed and directory updated. No staff access changed.");onReviewed();
  }catch(e){setStatus((e as {code?:string})?.code==="42501"?"Only the owner account can review profiles.":"Could not complete the review. Check the directory and existing link before trying again.");}finally{setBusy(false);}
 }
 return <section className="space-y-4 rounded-2xl bg-white p-6 text-slate-950"><h2 className="text-xl font-semibold">Member profile submissions</h2><p className="text-sm text-slate-600">Review contact details before updating the directory. Match an existing person when appropriate; never link by name alone. The member/visitor choice and serving interest are self-reported. Reviewing does not approve ministry membership or staff access.</p>
 <p role="status">{!directoryReady?"Wait for the member directory to load before reconciling profiles.":status||(!requests.length?"No profile submissions awaiting review.":"")}</p>
 {requests.map(item=><article key={item.user_id} className="space-y-3 rounded-xl border border-purple-100 p-4">
  <h3 className="font-semibold">{item.full_name}</h3><p className="break-all text-sm">{item.email}</p>{item.phone&&<p className="text-sm">Phone: {item.phone}</p>}{item.address&&<p className="whitespace-pre-line text-sm">Address: {item.address}</p>}
  <p className="text-sm">Serving interest: {item.department_id?(departments[item.department_id]??"Department unavailable"):"Not selected"}.</p>
  <p className="text-sm">Connection: {item.member_type}. Ministry emails: {item.ministry_emails?"Opted in":"Not opted in"}. Partnership invitations: {item.partnership_invitations?"Opted in":"Not opted in"}.</p>
  <label className="block text-sm font-medium">Directory action<select className="mt-2 min-h-12 w-full rounded-lg border p-2" disabled={!directoryReady||busy} value={links[item.user_id]??""} onChange={e=>setLinks(old=>({...old,[item.user_id]:e.target.value}))}><option value="">Choose after checking the person’s identity</option>{item.person_id?<option value={item.person_id}>Update the existing linked directory record</option>:<><option value="new">Create a new directory record</option>{people.map(person=><option key={person.id} value={person.id}>Link existing: {person.full_name}</option>)}</>}</select></label>
  <p className="text-xs text-slate-500">Approving replaces the chosen record’s name, phone and address with this submission. The earlier details are kept in People and can be restored. The link is logged and can be removed there.</p>
  <button disabled={busy||!directoryReady||!links[item.user_id]} onClick={()=>void review(item)} className="min-h-11 rounded-lg bg-purple-950 px-4 text-white disabled:opacity-50">Review and save to directory</button>
 </article>)}
 </section>;
}
