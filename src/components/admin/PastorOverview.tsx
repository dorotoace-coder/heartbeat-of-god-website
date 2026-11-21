import Link from "next/link";

const areas = [
  { name: "Attendance", detail: "Service counts and first-time visitors", view: "attendance" },
  { name: "People", detail: "Member directory and contact records", view: "members" },
  { name: "Treasury", detail: "Collections, confirmations and bank deposits", view: "treasury" },
  { name: "Media Vault", detail: "Private raw footage, audio and images", view: "media" },
  { name: "Foundation School", detail: "Classes, teachers and progress", view: "school" },
  { name: "Evangelism", detail: "Outreach visits and assigned follow-ups", view: "evangelism" },
  { name: "Events", detail: "Service and program planning", view: "events" },
];

export default function PastorOverview() {
  return <section className="space-y-6">
    <header className="rounded-3xl bg-[#2e1252] p-7 text-white">
      <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Heartbeat of God Ministry</p>
      <h1 className="mt-2 font-serif text-3xl">Pastor&apos;s workspace</h1>
      <p className="mt-2 text-purple-100">Choose an area to review its actual records and pending work.</p>
    </header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {areas.map(area => <Link key={area.view} href={`/admin?view=${area.view}`}
        className="rounded-2xl border border-purple-100 bg-white p-5 text-slate-950 shadow-sm transition hover:border-purple-400 hover:shadow-md">
        <h2 className="font-semibold text-[#2e1252]">{area.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{area.detail}</p>
        <span className="mt-5 inline-block text-sm font-semibold text-purple-900">Open workspace →</span>
      </Link>)}
    </div>
  </section>;
}
