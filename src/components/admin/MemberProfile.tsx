"use client";

import MinistryLogo from "@/components/ui/MinistryLogo";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Profile = { full_name:string; email:string; phone:string|null; address:string|null; member_type:string; department_id:string|null; ministry_emails:boolean; partnership_invitations:boolean; reviewed_at:string|null };
export default function MemberProfile() {
  const [profile,setProfile]=useState<Profile|null>(null);
  const [departments,setDepartments]=useState<{id:string;name:string}[]>([]);
  const [status,setStatus]=useState("Loading your profile…");
  const [saving,setSaving]=useState(false);
  useEffect(()=>{
    let active=true;
    async function load(){
      const auth=await supabase.auth.getUser();if(!active)return;
      if(!auth.data.user){setStatus("Please sign in to open your profile.");return;}
      const user=auth.data.user;
      const [record,teams]=await Promise.all([
        supabase.from("member_profile_intake").select("full_name,email,phone,address,member_type,department_id,ministry_emails,partnership_invitations,reviewed_at").eq("user_id",user.id).maybeSingle(),
        supabase.from("departments").select("id,name").not("name","is",null).order("display_order"),
      ]);
      if(!active)return;
      if(record.error||teams.error){setStatus("Your profile could not load. Refresh to try again.");return;}
      setDepartments(teams.data??[]);
      setProfile(record.data??{full_name:user.user_metadata?.full_name??"",email:user.email??"",phone:"",address:"",member_type:"exploring",department_id:"",ministry_emails:false,partnership_invitations:false,reviewed_at:null});
      setStatus(record.data?.reviewed_at?"Your details have been reviewed.":record.data?"Your details are awaiting staff review.":"Complete your details below. You can update them later.");
    }
    void load().catch(()=>{if(active)setStatus("Your profile could not load. Refresh to try again.");});
    return()=>{active=false;};
  },[]);
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(saving)return;
    const form=new FormData(event.currentTarget);setSaving(true);
    try{
      const result=await supabase.rpc("save_my_member_profile",{p_name:String(form.get("name")??"").trim(),p_phone:String(form.get("phone")??"").trim(),p_address:String(form.get("address")??"").trim(),p_type:form.get("type"),p_department:form.get("department")||null,p_ministry:form.has("ministry"),p_partnership:form.has("partnership")});
      if(result.error)throw result.error;
      setStatus("Profile saved. Staff will review your details and link or add your membership directory record. No staff access has been granted.");
    }catch{setStatus("We could not confirm the save. Please try again; resubmitting updates the same profile.");}
    finally{setSaving(false);}
  }
  const input="mt-2 min-h-12 w-full rounded-xl border border-purple-100 bg-purple-50/50 p-3 text-slate-950 focus:outline-2 focus:outline-purple-600";
  return <main id="main-content" className="min-h-screen bg-[#f5f2f7] px-4 py-8 text-slate-950"><div className="mx-auto max-w-2xl space-y-6">
    <Link href="/admin" className="inline-flex min-h-11 items-center text-purple-900 underline">Back to my ministry home</Link>
    <header><MinistryLogo className="mb-5 h-14 w-auto" /><p className="text-xs font-bold uppercase tracking-widest text-purple-700">Heartbeat of God · HBG PulseOS</p><h1 className="mt-3 text-3xl font-semibold text-purple-950">My member profile</h1><p className="mt-3 text-sm leading-6 text-slate-600">Keep your contact details up to date. Staff review submissions before adding or updating the ministry directory. You can view only your own profile here.</p></header>
    <p role="status" className="rounded-2xl border border-purple-100 bg-white p-4 text-sm">{status}</p>
    {profile&&<form onSubmit={save} className="space-y-5 rounded-3xl border border-white bg-white p-6 shadow-[0_10px_0_-5px_#e5dfec,0_25px_55px_-30px_rgba(46,18,82,0.3)]">
      <label className="block text-sm font-medium">Full name<input name="name" defaultValue={profile.full_name} maxLength={160} autoComplete="name" className={input} required /></label>
      <div className="text-sm"><p className="font-medium">Account email</p><p className="mt-2 break-all text-slate-600">{profile.email}</p></div>
      <label className="block text-sm font-medium">Phone number (optional)<input type="tel" name="phone" defaultValue={profile.phone??""} maxLength={50} autoComplete="tel" className={input} /></label>
      <label className="block text-sm font-medium">Address (optional)<textarea name="address" defaultValue={profile.address??""} maxLength={500} autoComplete="street-address" className={input} rows={3} /></label>
      <label className="block text-sm font-medium">How do you connect with the ministry?<select name="type" defaultValue={profile.member_type} className={input}><option value="exploring">I am exploring</option><option value="visitor">I am a visitor</option><option value="member">I consider myself a member</option></select></label>
      <label className="block text-sm font-medium">Where would you like to serve? (optional)<select name="department" defaultValue={profile.department_id??""} className={input}><option value="">Not sure yet</option>{departments.map(d=><option value={d.id} key={d.id}>{d.name}</option>)}</select></label>
      <p className="text-xs leading-5 text-slate-500">This records your interest, not a department appointment or permission to use staff tools.</p>
      <fieldset className="space-y-3 border-t border-purple-100 pt-5"><legend className="text-sm font-semibold">Optional email preferences</legend>
        <label className="flex gap-3 text-sm leading-6"><input name="ministry" type="checkbox" defaultChecked={profile.ministry_emails} className="mt-1 h-4 w-4 shrink-0" />Send me ministry news and announcements.</label>
        <label className="flex gap-3 text-sm leading-6"><input name="partnership" type="checkbox" defaultChecked={profile.partnership_invitations} className="mt-1 h-4 w-4 shrink-0" />Send me invitations to learn about ministry partnership.</label>
        <p className="text-xs leading-5 text-slate-500">Both are optional and can be changed here. Existing partnership reminder preferences are managed separately under My partnerships. Saving this profile does not send an invitation.</p>
      </fieldset>
      <button disabled={saving} className="min-h-12 rounded-xl bg-purple-950 px-6 font-semibold text-white disabled:opacity-60">{saving?"Saving…":"Save my profile"}</button>
    </form>}
  </div></main>;
}
