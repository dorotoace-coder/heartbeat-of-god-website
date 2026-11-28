"use client";

import MinistryLogo from "@/components/ui/MinistryLogo";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BookOpen, Compass, Heart, ArrowUpRight, Users } from "lucide-react";

const destinations = [
  { title: "My pastoral assignments", description: "Open your pastoral assignments and service preparation guide.", href: "/admin?view=pastorate", icon: BookOpen, color: "from-purple-100 to-white" },
  { title: "My member profile", description: "Add or update your contact details and communication preferences.", href: "/admin?view=profile", icon: Users, color: "from-purple-100 to-white" },
  { title: "Learn PulseOS", description: "Short guides and videos to help you find your way.", href: "/admin?view=help", icon: Compass, color: "from-purple-100 to-white" },
  { title: "My training", description: "Open the lessons available through your enrolment and training access.", href: "/admin?view=training", icon: BookOpen, color: "from-sky-100 to-white" },
  { title: "My partnerships", description: "Manage your own commitments and view your giving history.", href: "/partnership", icon: Heart, color: "from-rose-100 to-white" },
  { title: "Find a place to serve", description: "Explore ministry departments and express your interest in serving.", href: "/departments", icon: Users, color: "from-amber-100 to-white" },
];

export default function MemberHome({ name, restricted, accessError }: { name?: string; restricted?: boolean; accessError?: boolean }) {
  const firstName = name?.trim().split(/\s+/)[0];
  return <main id="main-content" className="min-h-screen bg-[#f5f2f7] px-4 py-6 text-slate-950 sm:px-8 sm:py-10">
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4"><MinistryLogo className="h-12 w-auto shrink-0" /><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-purple-700">Heartbeat of God</p><p className="mt-1 text-lg font-semibold text-purple-950">HBG PulseOS</p></div></div>
        <button type="button" onClick={async () => {
          await supabase.auth.signOut(); window.location.replace("/login");
        }} className="inline-flex min-h-11 items-center rounded-xl border border-white bg-white/80 px-5 text-sm font-semibold text-purple-950 shadow-sm">Sign out</button>
      </header>
      {accessError ? <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Staff access could not be checked. Your staff tools remain closed. Refresh to try again; you can still use the links below.</p> : restricted ? <p role="status" className="rounded-2xl border border-purple-100 bg-white p-4 text-sm text-purple-950">That workspace requires an authorised staff assignment. You can continue from your home page below.</p> : null}
      <section aria-labelledby="welcome-heading" className="relative isolate overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-[#32134f] via-[#512080] to-[#7b2ff7] px-6 py-10 text-white shadow-[0_24px_60px_-24px_rgba(46,18,82,0.65),inset_0_1px_0_rgba(255,255,255,0.3)] sm:px-10 sm:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 -z-10 h-80 w-80 rounded-full border border-white/20 bg-white/10 shadow-[inset_0_0_60px_rgba(255,255,255,0.12)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 right-16 -z-10 h-72 w-72 rounded-full border border-white/10 bg-purple-300/10" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-100">Your ministry home</p>
        <h1 id="welcome-heading" className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">Welcome{firstName ? `, ${firstName}` : " home"}.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-purple-50">Learn, connect and find your place to serve. Your next step starts here.</p>
        <Link href="/admin?view=help" className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-xl border border-white/70 bg-white px-5 font-semibold text-purple-950 shadow-[0_6px_0_rgba(20,6,36,0.2)] transition-transform motion-safe:hover:-translate-y-0.5">Start with a quick tour <ArrowUpRight size={18} aria-hidden="true" /></Link>
      </section>
      <section aria-labelledby="next-step-heading">
        <div className="mb-5"><h2 id="next-step-heading" className="text-xl font-semibold text-purple-950">Make yourself at home</h2><p className="mt-2 text-sm text-slate-600">Choose what you would like to do today.</p></div>
        <ul className="grid gap-5 sm:grid-cols-2">{destinations.map(({ title, description, href, icon: Icon, color }) =>
          <li key={href}><Link href={href} className="group flex h-full gap-5 rounded-3xl border border-white bg-white p-6 shadow-[0_10px_0_-5px_#e5dfec,0_22px_35px_-25px_rgba(46,18,82,0.4),inset_0_1px_0_white] transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-purple-700 motion-safe:hover:-translate-y-1 sm:p-7">
            <span aria-hidden="true" className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white bg-gradient-to-br ${color} text-purple-800 shadow-[0_5px_10px_-4px_rgba(46,18,82,0.35),inset_0_1px_0_white]`}><Icon size={25} /></span>
            <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2 text-lg font-semibold text-purple-950">{title}<ArrowUpRight size={18} className="mt-1 shrink-0 text-purple-500" aria-hidden="true" /></span><span className="mt-2 block text-sm leading-6 text-slate-600">{description}</span></span>
          </Link></li>)}</ul>
      </section>
      <aside className="rounded-2xl border border-purple-100 bg-white/70 p-5 text-sm leading-6 text-slate-600"><h2 className="font-semibold text-purple-950">A place for everyone. Access with purpose.</h2><p className="mt-2">You do not need a staff assignment to use this home page. Department workspaces become available after an authorised assignment. Training depends on your enrolment. Choosing a department or creating an account does not grant staff access.</p></aside>
      <footer className="pb-3 text-sm text-slate-500"><Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">Visit the ministry website</Link></footer>
    </div>
  </main>;
}
