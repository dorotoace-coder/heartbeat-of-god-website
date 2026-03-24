"use client";

import { useEffect, useState } from "react";
import { PulseState } from "@/lib/pulse";
import { Activity, ShieldAlert, Lock, ShieldOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Profile, UserRole } from "@/lib/types";
import { AdminContext, hasNavAccess, canPerformAction } from "@/lib/permissions";

import { PastorView } from "@/components/admin/PastorView";
import { ManagerView } from "@/components/admin/ManagerView";
import { LeaderView } from "@/components/admin/LeaderView";
import { MembersView } from "@/components/admin/MembersView";
import { EventsView } from "@/components/admin/EventsView";
import { MediaView } from "@/components/admin/MediaView";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// ─── Access Denied Block ─────────────────────────────────
function AccessDenied({ view }: { view: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
        <ShieldOff className="w-10 h-10 text-slate-400" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Insufficient Permissions</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm text-center">
        Your role does not have access to the <span className="font-semibold capitalize">{view}</span> module. 
        Contact your Pastor or an Owner to request elevated access.
      </p>
    </div>
  );
}

// ─── Dev Role Switcher (development only) ────────────────
function DevRoleSwitcher({ currentRole, onSwitch }: { currentRole: UserRole; onSwitch: (role: UserRole) => void }) {
  if (process.env.NODE_ENV !== "development") return null;

  const roles: UserRole[] = ["owner", "pastor", "manager", "leader"];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mr-1">DEV</span>
      {roles.map((r) => (
        <button
          key={r}
          onClick={() => onSwitch(r)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
            currentRole === r
              ? "bg-amber-500 text-white shadow-sm"
              : "text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ─── Dashboard Content ───────────────────────────────────
function DashboardContent({ pulse, profile, activeRole, onRoleSwitch }: { pulse: PulseState; profile: Profile; activeRole: UserRole; onRoleSwitch: (role: UserRole) => void }) {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "overview";

  const renderDashboard = () => {
    // Check nav-level access first
    if (!hasNavAccess(activeRole, view)) {
      return <AccessDenied view={view} />;
    }

    switch (view) {
      case 'members':
        return <MembersView />;
      case 'events':
        return <EventsView />;
      case 'media':
        return <MediaView />;
      case 'settings':
        return <div className="p-12 text-center text-slate-400 font-bold">System Rules Management - Coming Soon</div>;
      case 'overview':
      default:
        switch (activeRole) {
          case 'owner':
          case 'pastor':
            return <PastorView pulse={pulse} />;
          case 'manager':
            return <ManagerView pulse={pulse} />;
          case 'leader':
            return <LeaderView pulse={pulse} />;
          default:
            return <AccessDenied view="overview" />;
        }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Top Automated Status Bar (Shared) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="relative flex h-3 w-3">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
           </div>
           <div>
             <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Signed in as</h2>
             <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{profile.full_name} ({activeRole.toUpperCase()})</p>
           </div>
        </div>
        <div className="flex gap-4 items-center flex-wrap justify-end">
          <DevRoleSwitcher currentRole={activeRole} onSwitch={onRoleSwitch} />
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 font-medium text-xs text-slate-500">
            Platform: System Healthy
          </div>
          <button 
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:text-red-500 rounded-xl text-xs font-bold transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>

      {renderDashboard()}
    </div>
  );
}

// ─── Main Admin Dashboard ────────────────────────────────
export default function AdminDashboard() {
  const [pulse, setPulse] = useState<PulseState | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleOverride, setRoleOverride] = useState<UserRole | null>(null);

  const activeRole: UserRole = roleOverride ?? profile?.role ?? "leader";

  useEffect(() => {
    const initAdmin = async () => {
      console.log("Admin Dashboard: Initializing...");
      try {
        setLoading(true);
        
        // 1. Get Session
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        console.log("Admin Dashboard: Session check:", session ? "Active" : "None", authError || "");
        
        if (authError || !session) {
          console.log("Admin Dashboard: No valid session, redirecting to login...");
          window.location.href = "/login?callbackUrl=%2Fadmin";
          return;
        }

        // 2. Fetch Profile and Role
        console.log("Admin Dashboard: Loading profile for UID:", session.user.id);
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*, departments(name)")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error("Admin Dashboard: Profile error:", profileError);
          setError(`Unauthorized access. Profile for ${session.user.email} not found.`);
          return;
        }

        console.log("Admin Dashboard: Profile role detected:", profileData.role);
        const fullProfile = profileData as any;
        setProfile({
          ...fullProfile,
          department_name: fullProfile.departments?.name
        });

        // 3. Fetch Pulse Data
        console.log("Admin Dashboard: Fetching Pulse OS metrics...");
        const res = await fetch("/api/pulse");
        const pulseData = await res.json();
        console.log("Admin Dashboard: Pulse data synchronized.");
        setPulse(pulseData);

      } catch (err) {
        console.error("Admin Dashboard: Initialization exception:", err);
        setError("Critical system error during initialization.");
      } finally {
        setLoading(false);
      }
    };

    initAdmin();
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/pulse");
        const data = await res.json();
        setPulse(data);
      } catch (e) {}
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Activity className="animate-pulse w-12 h-12 text-blue-500" />
        <p className="font-bold tracking-widest uppercase text-xs">Connecting to The Pulse OS...</p>
      </div>
    </div>
  );

  if (error || !profile || !pulse) return (
    <div className="flex h-[60vh] items-center justify-center p-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-xl">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Access Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">{error || "You do not have permission to view this resource."}</p>
        <button 
           onClick={() => window.location.href = '/login'}
           className="w-full py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition-transform"
        >
          Return to Login
        </button>
      </div>
    </div>
  );

  // Wrap the entire admin area in AdminContext so layout sidebar can read the role
  return (
    <AdminContext.Provider value={{ role: activeRole }}>
      <Suspense fallback={<div>Synchronizing...</div>}>
        <DashboardContent 
          pulse={pulse} 
          profile={profile} 
          activeRole={activeRole}
          onRoleSwitch={setRoleOverride}
        />
      </Suspense>
    </AdminContext.Provider>
  );
}
