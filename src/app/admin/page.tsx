"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TrainingHub from "@/components/admin/TrainingHub";
import PastorDashboard from "@/components/admin/PastorDashboard";
import PrivateMediaVault from "@/components/admin/PrivateMediaVault";
import PeopleIntake from "@/components/admin/PeopleIntake";
import FoundationSchool from "@/components/admin/FoundationSchool";
import Evangelism from "@/components/admin/Evangelism";
import ServiceAttendance from "@/components/admin/ServiceAttendance";
import TreasurySummary from "@/components/admin/TreasurySummary";

type Workspace = "pastor" | "media" | "attendance" | "treasury" | "school" | "evangelism";
function StaffWorkspace() {
  const requested = useSearchParams().get("view");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [message, setMessage] = useState("Opening your workspace…");
  useEffect(() => {
    let current = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!current) return;
      if (!data.user) {
        window.location.replace("/login?callbackUrl=%2Fadmin");
        return;
      }
      const result = await supabase.rpc("staff_workspace");
      if (!current) return;
      if (result.error) setMessage("Your workspace could not load. Please refresh.");
      else if (["pastor", "media", "attendance", "treasury", "school", "evangelism"].includes(result.data)) setWorkspace(result.data);
      else setMessage("Your department assignment is pending.");
      setIdentityReady(true);
    }
    void load();
    return () => { current = false; };
  }, []);
  if (requested === "training" && !identityReady) return <p role="status" className="p-8">Opening training…</p>;
  if (workspace === "pastor") return <PastorDashboard />;
  if (requested === "training") return <main className="mx-auto max-w-7xl p-4 sm:p-8"><a href="/admin" className="mb-5 inline-block min-h-11 text-purple-900 underline">Back to my workspace</a><TrainingHub /></main>;
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
    <header className="flex items-center justify-between gap-3">
      <div><h1 className="text-xl font-semibold">HBG Pulse OS</h1><a href="/admin?view=training" className="mt-2 inline-block min-h-11 text-purple-900 underline">Open training</a></div>
      <button onClick={async () => { await supabase.auth.signOut(); window.location.replace("/login"); }}>Sign out</button>
    </header>
    {!workspace ? <p role="status">{message}</p> : requested && requested !== workspace ?
      <p>This section is restricted. <a className="underline" href="/admin">Open my workspace</a></p> :
      workspace === "evangelism" ? <Evangelism /> :
      workspace === "school" ? <FoundationSchool /> :
      workspace === "media" ? <PrivateMediaVault /> :
      workspace === "attendance" ? <><ServiceAttendance /><PeopleIntake /></> : <TreasurySummary />}
  </main>;
}

export default function AdminPage() {
  return <Suspense fallback={<p>Opening your workspace…</p>}><StaffWorkspace /></Suspense>;
}
