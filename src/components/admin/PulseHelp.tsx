"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpen, Download, Printer, Search, CheckCircle2, ChevronRight } from "lucide-react";
import { guideEdition, pulseGuides, startSteps } from "@/lib/help/guides";

export default function PulseHelp() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("treasury");
  const [tab, setTab] = useState<"guides" | "video">("guides");
  const guide = pulseGuides.find(item => item.id === selected)!;
  const filtered = pulseGuides.filter(item => `${item.title} ${item.audience} ${item.summary}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const clips = pulseGuides.filter(item => item.narration);
  return <section className="pulse-help space-y-8 text-[#2e1252]">
    <nav aria-label="Help navigation" className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href="/admin" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><ArrowLeft size={17} aria-hidden="true" />My workspace</Link>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin?view=training" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-purple-200 bg-white px-4 text-sm font-semibold"><BookOpen size={17} aria-hidden="true" />Ministry training</Link>
        <button type="button" onClick={() => { setTab("guides"); window.setTimeout(() => window.print(), 0); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-purple-200 bg-white px-4 text-sm font-semibold"><Printer size={17} aria-hidden="true" />Print selected guide</button>
      </div>
    </nav>
    <header className="rounded-3xl border border-purple-100 bg-white p-6 sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-purple-700">HBG Pulse OS · Team help</p>
      <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Serve with confidence.</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">A practical guide to your workspace. Find the task, follow the steps, and check the saved result. Come back whenever you need a reminder.</p>
      <p className="mt-4 text-sm leading-6 text-purple-800">Everyone signed in can read these guides. Your access to records stays with your assigned role.</p>
      <p className="mt-4 text-xs text-slate-500">Guide edition {guideEdition}</p>
    </header>
    <section aria-labelledby="help-start" className="rounded-3xl bg-[#2e1252] p-6 text-white sm:p-8 print:bg-white print:text-black">
      <h2 id="help-start" className="font-serif text-2xl">Your first four steps</h2>
      <ol className="mt-5 grid gap-5 md:grid-cols-2">{startSteps.map((step, index) => <li key={step} className="flex items-start gap-3 text-sm leading-6"><span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 text-[#FFC83D] print:text-black">{index + 1}</span><span>{step}</span></li>)}</ol>
    </section>
    <section aria-labelledby="help-poster" className="grid items-start gap-5 rounded-3xl border border-purple-100 bg-white p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:p-8 print:hidden">
      <div><p className="text-xs font-semibold uppercase tracking-[.15em] text-purple-700">At a glance</p><h2 id="help-poster" className="mt-2 font-serif text-2xl">The whole workspace, on one page.</h2><p className="mt-3 text-sm leading-6 text-slate-600">Keep the overview on your phone or print it for the team. The detailed, searchable instructions are below.</p>
        <a href="/help/pulse-os-overview.png" download className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-900 px-4 text-sm font-semibold text-white"><Download size={17} aria-hidden="true" />Download infographic</a>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold"><a href="/help/pulse-os-overview.pdf" download className="inline-flex min-h-11 items-center underline">Printable poster PDF</a><a href="/help/pulse-os-team-guide.pdf" download className="inline-flex min-h-11 items-center underline">Complete team guide PDF</a></div>
        <p className="mt-3 text-xs leading-5 text-slate-500">The picture is an overview. Use the text guide for button names, confirmation messages and recovery steps.</p>
      </div>
      <a href="/help/pulse-os-overview.png" target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-purple-100" aria-label="Open the Pulse OS overview infographic at full size">
        <Image src="/help/pulse-os-overview.png" width={1024} height={1536} alt="Pulse OS overview: sign in, open your assigned workspace, read your role guide and check the save confirmation. Six role summaries are available in full text below." className="h-auto w-full" />
      </a>
    </section>
    <div className="flex flex-wrap gap-2 border-b border-purple-100 pb-3 print:hidden" role="group" aria-label="Help content">
      <button type="button" aria-pressed={tab === "guides"} onClick={() => setTab("guides")} className="min-h-11 rounded-full border border-purple-100 bg-white px-5 text-sm font-semibold aria-pressed:bg-purple-900 aria-pressed:text-white">Step-by-step guides</button>
      <button type="button" aria-pressed={tab === "video"} onClick={() => setTab("video")} className="min-h-11 rounded-full border border-purple-100 bg-white px-5 text-sm font-semibold aria-pressed:bg-purple-900 aria-pressed:text-white">Short-video scripts</button>
    </div>
    {tab === "guides" ? <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <label className="rounded-2xl border border-purple-100 bg-white p-4 text-sm font-semibold lg:hidden print:hidden">Choose your guide<select value={selected} onChange={event => setSelected(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-purple-200 bg-white p-3 text-base">{pulseGuides.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <aside className="hidden min-w-0 rounded-2xl border border-purple-100 bg-white p-4 lg:block print:hidden">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-purple-100 p-3"><Search size={17} aria-hidden="true" /><span className="sr-only">Search guides</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a task or role" className="min-w-0 w-full text-sm outline-none focus:ring-2 focus:ring-purple-300" /></label>
        <nav aria-label="Pulse OS guides" className="mt-3 space-y-1">{filtered.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left text-sm aria-pressed:bg-purple-100 aria-pressed:font-semibold hover:bg-purple-50"><span>{item.title}</span><ChevronRight size={15} aria-hidden="true" /></button>)}</nav>
        {!filtered.length && <p role="status" className="p-3 text-sm text-slate-600">No guide matches. Try a role such as media or a task such as intake.</p>}
      </aside>
      <article key={guide.id} aria-labelledby="selected-guide" className="min-w-0 rounded-3xl border border-purple-100 bg-white p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.15em] text-purple-700">{guide.audience}</p>
        <h2 id="selected-guide" className="mt-3 font-serif text-3xl">{guide.title}</h2>
        <p className="mt-3 leading-7 text-slate-600">{guide.summary}</p>
        <p className="mt-5 rounded-xl bg-purple-50 p-4 text-sm leading-6"><strong>Start here: </strong>{guide.where}</p>
        <ol className="mt-6 space-y-5">{guide.steps.map((step, index) => <li key={step} className="flex gap-3 leading-7"><span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold">{index + 1}</span><span>{step}</span></li>)}</ol>
        <div className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5"><h3 className="flex items-center gap-2 font-semibold"><CheckCircle2 size={18} aria-hidden="true" />How you know it worked</h3><p className="mt-2 text-sm leading-6">{guide.confirmation}</p></div>
        <div className="mt-4 rounded-2xl border border-purple-100 p-5"><h3 className="font-semibold">If something goes wrong</h3><p className="mt-2 text-sm leading-6 text-slate-600">{guide.recovery}</p></div>
      </article>
    </div> : <section aria-labelledby="help-video" className="space-y-5 print:hidden">
      <div className="rounded-2xl bg-white p-6"><h2 id="help-video" className="font-serif text-3xl">One task. One short clip.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">These are ready-to-produce scripts, not playable videos. Each explains one role in under 90 seconds. Finished captioned clips can be added here after review.</p><a href="/help/pulse-os-tutorial-source.txt" download="HBG-Pulse-OS-tutorial-source.txt" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-900 px-4 text-sm font-semibold text-white"><Download size={17} aria-hidden="true" />Download tutorial source pack</a><p className="mt-3 text-xs text-slate-500">Plain text for a video producer or NotebookLM. No real account or member data is included.</p></div>
      <div className="grid gap-4 md:grid-cols-2">{clips.map((clip, index) => <details key={clip.id} className="rounded-2xl border border-purple-100 bg-white p-5"><summary className="min-h-11 cursor-pointer leading-7"><span className="mr-2 text-sm text-purple-600">{String(index + 1).padStart(2, "0")}</span><strong>{clip.title}</strong><span className="ml-2 text-sm text-slate-500">{clip.seconds}s · Script ready</span></summary><p className="mt-4 text-sm leading-7 text-slate-700">{clip.narration}</p><p className="mt-3 text-xs leading-5 text-slate-500">Show the task title, the workspace, the listed actions and the saved result. Use demonstration data only.</p></details>)}</div>
    </section>}
    <footer className="rounded-2xl border border-purple-100 bg-white p-5 text-sm leading-6 text-slate-600"><strong className="text-purple-950">Learn together. Work within your assigned access.</strong><p>Menus vary by role. A missing assignment needs your leader’s help. Do not share account details or put real records into tutorial screenshots.</p></footer>
  </section>;
}
