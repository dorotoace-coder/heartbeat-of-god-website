"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDepartments, type DepartmentRow } from "@/lib/data";

export default function DepartmentsView() {
  const [departments, setDepartments] = useState<DepartmentRow[] | null>(null);
  useEffect(() => {
    let active = true;
    void getDepartments().then((rows) => { if (active) setDepartments(rows); });
    return () => { active = false; };
  }, []);

  return <section aria-labelledby="department-heading" className="space-y-6">
    <div><h1 id="department-heading" className="text-2xl font-semibold text-purple-950">Ministry departments</h1>
      <p className="mt-2 text-sm text-slate-600">Explore each team&apos;s service responsibilities and opportunities.</p></div>
    {departments === null ? <p role="status">Loading departments…</p> :
      <ul className="grid gap-4 md:grid-cols-2">{departments.map((department) =>
        <li key={department.id ?? department.name} className="rounded-2xl border border-purple-100 bg-white p-6">
          <h2 className="text-lg font-semibold text-purple-950">{department.name}</h2>
          <p className="mt-2 text-sm text-slate-600">{department.description}</p>
          <p className="mt-4 text-sm leading-6">{department.what_they_do}</p>
          <p className="mt-3 text-sm text-slate-600">{department.who_should_join}</p>
        </li>)}</ul>}
    <Link href="/admin?view=training" className="inline-flex min-h-11 items-center rounded-lg bg-purple-950 px-4 text-sm font-medium text-white">Open ministry training</Link>
  </section>;
}
