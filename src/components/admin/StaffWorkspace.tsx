"use client";

import MinistryLogo from "@/components/ui/MinistryLogo";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TrainingHub from "@/components/admin/TrainingHub";
import PulseHelp from "@/components/admin/PulseHelp";
import PastorDashboard from "@/components/admin/PastorDashboard";
import PrivateMediaVault from "@/components/admin/PrivateMediaVault";
import PeopleIntake from "@/components/admin/PeopleIntake";
import FoundationSchool from "@/components/admin/FoundationSchool";
import Evangelism from "@/components/admin/Evangelism";
import FollowupBoard from "@/components/admin/FollowupBoard";
import ServiceAttendance from "@/components/admin/ServiceAttendance";
import TreasurySummary from "@/components/admin/TreasurySummary";
import MemberHome from "@/components/admin/MemberHome";
import MemberProfile from "@/components/admin/MemberProfile";
import PastoratePilot from "./PastoratePilot";
import InvitationAccept from "./InvitationAccept";

type Workspace = "pastor" | "media" | "attendance" | "treasury" | "school" | "evangelism";
function WorkspaceContent() {
  const params = useSearchParams();
  const requested = params.get("view");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [message, setMessage] = useState("Opening your workspace…");
  const [memberName, setMemberName] = useState("");
  const [accessError, setAccessError] = useState(false);
  useEffect(() => {
    let current = true;
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!current) return;
      if (!data.user) {
        // Keep the page (for example an invitation link) so sign-in can return to it.
        window.location.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
        return;
      }
      const fullName = data.user.user_metadata?.full_name;
      if (typeof fullName === "string") setMemberName(fullName);
      const result = await supabase.rpc("staff_workspace");
      if (!current) return;
      setAccessError(!!result.error);
      if (!current) return;
      if (result.error) setMessage("Your workspace could not load. Please refresh.");
      else if (["pastor", "media", "attendance", "treasury", "school", "evangelism"].includes(result.data)) setWorkspace(result.data);
      else setMessage("Your department assignment is pending.");
      setIdentityReady(true);
    }
    void load();
    return () => { current = false; };
  }, []);
  if (!identityReady) return <p role="status" className="p-8">{requested === "help" ? "Opening Pulse OS Help…" : "Opening training…"}</p>;
  if (requested === "invitation") return <InvitationAccept token={params.get("token") ?? ""} />;
  if (requested === "help") return <main id="main-content" className="mx-auto max-w-7xl bg-[#f5f2f7] p-4 sm:p-8"><PulseHelp /></main>;
  if (requested === "profile") return <MemberProfile />;
  if (workspace === "pastor") return <PastorDashboard />;
  if (requested === "pastorate") return <main className="mx-auto max-w-4xl p-6"><PastoratePilot /></main>;
  if (requested === "training") return <main className="mx-auto max-w-7xl p-4 sm:p-8"><a href="/admin" className="mb-5 inline-block min-h-11 text-purple-900 underline">Back to my workspace</a> · <a href="/admin?view=help" className="inline-block min-h-11 text-purple-900 underline">Pulse OS Help</a><TrainingHub /></main>;
  if (!workspace) return <MemberHome name={memberName} accessError={accessError} restricted={!!requested} />;
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
    <header className="flex items-center justify-between gap-3">
      <div><MinistryLogo className="mb-4 h-12 w-auto" /><h1 className="text-xl font-semibold">HBG Pulse OS</h1><a href="/admin?view=training" className="mt-2 inline-block min-h-11 text-purple-900 underline">Open training</a> · <a href="/admin?view=profile" className="inline-block min-h-11 text-purple-900 underline">My profile</a> · <a href="/partnership" className="inline-block min-h-11 text-purple-900 underline">My partnerships</a> · <a href="/admin?view=help" className="inline-block min-h-11 text-purple-900 underline">Pulse OS Help</a></div>
      <button onClick={async () => { await supabase.auth.signOut(); window.location.replace("/login"); }}>Sign out</button>
    </header>
    {!workspace ? <p role="status">{message}</p> : workspace === "evangelism" && requested === "followup" ? <FollowupBoard /> : requested && requested !== workspace ?
      <p>This section is restricted. <a className="underline" href="/admin">Open my workspace</a></p> :
      workspace === "evangelism" ? <><a href="/admin?view=followup" className="inline-block min-h-11 text-purple-900 underline">Open follow-up board</a><Evangelism /></> :
      workspace === "school" ? <FoundationSchool /> :
      workspace === "media" ? <PrivateMediaVault /> :
      workspace === "attendance" ? <><ServiceAttendance /><PeopleIntake /></> : <TreasurySummary />}
  </main>;
}

export default function StaffWorkspace({ marriagesEnabled }: { marriagesEnabled: boolean }) {
  return <>{marriagesEnabled && <nav aria-label="Ministry care" className="border-b border-purple-100 bg-white px-5 py-3"><a href="/marriages" className="inline-flex min-h-11 items-center rounded-full bg-purple-50 px-5 text-sm font-semibold text-purple-950">Marriage &amp; Counselling</a></nav>}<WorkspaceContent /></>;
}
