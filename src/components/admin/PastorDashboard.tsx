"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AdminContext } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";
import PastorOverview from "./PastorOverview";
import TrainingHub from "./TrainingHub";
import PrivateMediaVault from "./PrivateMediaVault";
import PeopleDirectory from "./PeopleDirectory";
import SchoolAdministration from "./SchoolAdministration";
import Evangelism from "./Evangelism";
import FollowupBoard from "./FollowupBoard";
import ServiceAttendance from "./ServiceAttendance";
import TreasurySummary from "./TreasurySummary";
import { MediaView } from "./MediaView";
import { EventsView } from "./EventsView";
import { InquiriesView } from "./InquiriesView";
import { DailyWordView } from "./DailyWordView";
import { PrayerWallView } from "./PrayerWallView";

import LiveMeetings from "./LiveMeetings";
import DepartmentsView from "./DepartmentsView";

const navigation = [
  ["overview", "Overview"], ["profile", "My profile"], ["help", "Pulse OS Help"], ["live", "Live Church"], ["training", "Training"], ["attendance", "Attendance"], ["members", "People"], ["departments", "Departments"],
  ["treasury", "Treasury"], ["media", "Media"], ["school", "Foundation School"],
  ["followup", "Follow-up"], ["evangelism", "Evangelism"], ["events", "Events"], ["inquiries", "Intake Inbox"],
  ["dailyword", "Daily Word"], ["prayerwall", "Prayer Wall"],
] as const;

export default function PastorDashboard() {
  const requested = useSearchParams().get("view") ?? "overview";
  const view = navigation.some(([id]) => id === requested) ? requested : "overview";
  const [name, setName] = useState("Pastor");
  const [role, setRole] = useState<UserRole>("pastor");

  useEffect(() => {
    let active = true;
    async function load() {
      const identity = await supabase.auth.getUser();
      if (!identity.data.user) return;
      const profile = await supabase.from("profiles").select("full_name,role")
        .eq("id", identity.data.user.id).maybeSingle();
      if (!active || profile.error || !profile.data) return;
      if (profile.data.full_name) setName(profile.data.full_name);
      if (profile.data.role === "owner" || profile.data.role === "pastor") setRole(profile.data.role);
    }
    void load();
    return () => { active = false; };
  }, []);

  function content() {
    switch (view) {
      case "live": return <LiveMeetings />;
      case "training": return <TrainingHub />;
      case "attendance": return <ServiceAttendance />;
      case "members": return <PeopleDirectory />;
      case "departments": return <DepartmentsView />;
      case "treasury": return <TreasurySummary />;
      case "media": return <div className="space-y-8"><PrivateMediaVault /><MediaView /></div>;
      case "school": return <SchoolAdministration />;
      case "followup": return <FollowupBoard />;
      case "evangelism": return <Evangelism />;
      case "events": return <EventsView />;
      case "inquiries": return <InquiriesView />;
      case "dailyword": return <DailyWordView />;
      case "prayerwall": return <PrayerWallView />;
      default: return <PastorOverview />;
    }
  }

  return <AdminContext.Provider value={{ role }}>
    <div className="min-h-screen bg-[#f5f2f7] text-slate-950">
      <header className="border-b border-purple-100 bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div><p className="font-serif text-xl font-semibold text-[#2e1252]">HBG Pulse OS</p>
            <p className="text-xs text-slate-600">Pastor&apos;s workspace · {name}</p></div>
          <button className="min-h-11 rounded-lg border border-purple-200 px-4 text-sm text-purple-950"
            onClick={async () => { await supabase.auth.signOut(); window.location.replace("/login"); }}>Sign out</button>
        </div>
        <nav aria-label="Pastor workspaces" className="mx-auto mt-4 flex max-w-7xl flex-wrap gap-2">
          {navigation.map(([id, label]) => <Link key={id} href={id === "overview" ? "/admin" : `/admin?view=${id}`}
            aria-current={view === id ? "page" : undefined}
            className={`rounded-full px-3 py-2 text-sm font-medium transition ${view === id ? "bg-[#2e1252] text-white" : "bg-purple-50 text-purple-950 hover:bg-purple-100"}`}>{label}</Link>)}
        </nav>
      </header>
      <main id="main-content" className="mx-auto max-w-7xl p-4 sm:p-8">{content()}</main>
    </div>
  </AdminContext.Provider>;
}
